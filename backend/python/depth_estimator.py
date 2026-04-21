#!/usr/bin/env python3
"""
2D to 3D Depth Estimation Script - FULLY CORRECTED VERSION
Uses GLPN model for monocular depth estimation and Open3D for 3D reconstruction
"""

import sys
import json
import os
import time
import numpy as np
from PIL import Image
import warnings
warnings.filterwarnings('ignore')

try:
    import torch
    from transformers import GLPNImageProcessor, GLPNForDepthEstimation
    import open3d as o3d
except ImportError as e:
    print(json.dumps({
        "success": False,
        "error": f"Missing required library: {str(e)}"
    }))
    sys.exit(1)

class DepthEstimator:
    def __init__(self, quality='high'):
        self.quality = quality
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        print(f"Using device: {self.device}", file=sys.stderr)
        print(f"Quality mode: {self.quality}", file=sys.stderr)
        
        try:
            model_name = "vinvino02/glpn-nyu"
            self.processor = GLPNImageProcessor.from_pretrained(model_name)
            self.model = GLPNForDepthEstimation.from_pretrained(model_name)
            self.model.to(self.device)
            self.model.eval()
            print("Model loaded successfully", file=sys.stderr)
        except Exception as e:
            print(f"Error loading model: {str(e)}", file=sys.stderr)
            raise
    
    def process_image(self, image_path, output_dir, retry_with_fallback=True):
        start_time = time.time()
        
        try:
            if not os.path.exists(image_path):
                raise FileNotFoundError(f"Image not found: {image_path}")
            
            image = Image.open(image_path)
            print(f"Original image size: {image.size}", file=sys.stderr)
            
            # Quality-based resolution
            if self.quality == 'high':
                new_height = 640 if image.height > 640 else image.height
                voxel_size = 0.003
                use_poisson = True
            elif self.quality == 'medium':
                new_height = 512 if image.height > 512 else image.height
                voxel_size = 0.006
                use_poisson = True
            else:  # fast
                new_height = 384 if image.height > 384 else image.height
                voxel_size = 0.01
                use_poisson = False
            
            new_height -= (new_height % 32)
            new_width = int(new_height * (image.width / image.height))
            diff = new_width % 32
            new_width = new_width - diff if diff < 16 else new_width + 32 - diff
            new_size = (new_width, new_height)
            image = image.resize(new_size, Image.Resampling.LANCZOS)
            print(f"Resized image to: {new_size}", file=sys.stderr)
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            print("Generating depth map...", file=sys.stderr)
            inputs = self.processor(images=image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            with torch.no_grad():
                outputs = self.model(**inputs)
                predicted_depth = outputs.predicted_depth
            
            # Process depth map
            pad = 16
            depth_array = predicted_depth.squeeze().cpu().numpy()
            
            print(f"Depth array shape: {depth_array.shape}", file=sys.stderr)
            
            depth_min = depth_array.min()
            depth_max = depth_array.max()
            if depth_max - depth_min > 0:
                depth_array = (depth_array - depth_min) / (depth_max - depth_min) * 1000.0
            else:
                depth_array = np.ones_like(depth_array) * 500.0
            
            if depth_array.shape[0] > pad*2 and depth_array.shape[1] > pad*2:
                depth_array = depth_array[pad:-pad, pad:-pad]
            
            print(f"Depth after padding: {depth_array.shape}", file=sys.stderr)
            
            # Save depth map
            depth_map_path = os.path.join(output_dir, "depth_map.png")
            import matplotlib
            matplotlib.use('Agg')
            import matplotlib.pyplot as plt
            
            plt.figure(figsize=(10, 8))
            plt.imshow(depth_array, cmap='plasma')
            plt.axis('off')
            plt.tight_layout()
            plt.savefig(depth_map_path, dpi=150, bbox_inches='tight', pad_inches=0)
            plt.close()
            print(f"Depth map saved", file=sys.stderr)
            
            # Get image
            image_tensor = inputs['pixel_values'].squeeze(0)
            image_np = (image_tensor.permute(1, 2, 0).cpu().numpy() * 255).astype(np.uint8)
            
            h, w = image_np.shape[:2]
            if h > pad*2 and w > pad*2:
                image_np = image_np[pad:h-pad, pad:w-pad]
            
            image_np = np.ascontiguousarray(image_np)
            height, width = image_np.shape[:2]
            print(f"Image dimensions: {width}x{height}", file=sys.stderr)
            
            if depth_array.shape[0] != height or depth_array.shape[1] != width:
                depth_img = Image.fromarray(depth_array.astype(np.float32))
                depth_img = depth_img.resize((width, height), Image.Resampling.LANCZOS)
                depth_array = np.array(depth_img)
            
            depth_array = np.ascontiguousarray(depth_array.astype(np.uint16))
            
            # Create Open3D images
            depth_o3d = o3d.geometry.Image(depth_array)
            image_o3d = o3d.geometry.Image(image_np)
            
            rgbd_image = o3d.geometry.RGBDImage.create_from_color_and_depth(
                image_o3d, depth_o3d,
                depth_scale=1000.0,
                depth_trunc=15.0,
                convert_rgb_to_intensity=False
            )
            
            fx = fy = width * 0.9
            cx = width / 2
            cy = height / 2
            
            camera_intrinsic = o3d.camera.PinholeCameraIntrinsic()
            camera_intrinsic.set_intrinsics(width, height, fx, fy, cx, cy)
            
            print("Creating point cloud...", file=sys.stderr)
            pcd_raw = o3d.geometry.PointCloud.create_from_rgbd_image(
                rgbd_image, camera_intrinsic
            )
            
            print(f"Raw points: {len(pcd_raw.points)}", file=sys.stderr)
            
            if len(pcd_raw.points) == 0:
                print("Manual point generation...", file=sys.stderr)
                points = []
                colors = []
                
                step = 1
                for v in range(0, height, step):
                    for u in range(0, width, step):
                        z = float(depth_array[v, u])
                        if z > 5 and z < 995:
                            x = (u - cx) * z / fx
                            y = (v - cy) * z / fy
                            points.append([x, y, -z])
                            colors.append(image_np[v, u].astype(float) / 255.0)
                
                if len(points) > 0:
                    pcd_raw = o3d.geometry.PointCloud()
                    pcd_raw.points = o3d.utility.Vector3dVector(np.array(points))
                    pcd_raw.colors = o3d.utility.Vector3dVector(np.array(colors))
                    print(f"Manual points: {len(pcd_raw.points)}", file=sys.stderr)
            
            if len(pcd_raw.points) == 0:
                raise ValueError("No points generated")
            
            # Downsample
            pcd = pcd_raw.voxel_down_sample(voxel_size)
            print(f"After downsampling: {len(pcd.points)} points", file=sys.stderr)
            
            # Outlier removal
            if len(pcd.points) > 50:
                try:
                    cl, ind = pcd.remove_statistical_outlier(nb_neighbors=25, std_ratio=2.5)
                    pcd_before = len(pcd.points)
                    pcd = pcd.select_by_index(ind)
                    if len(pcd.points) < pcd_before * 0.3:
                        print("Too many points removed, reverting...", file=sys.stderr)
                        pcd = pcd_raw.voxel_down_sample(voxel_size)
                    print(f"After outlier removal: {len(pcd.points)} points", file=sys.stderr)
                except:
                    pass
            
            # Estimate normals
            print("Estimating normals...", file=sys.stderr)
            pcd.estimate_normals(
                search_param=o3d.geometry.KDTreeSearchParamHybrid(
                    radius=0.04 if self.quality == 'high' else 0.05, 
                    max_nn=40 if self.quality == 'high' else 30
                )
            )
            
            # Save point cloud
            pcd_path = os.path.join(output_dir, "point_cloud.ply")
            o3d.io.write_point_cloud(pcd_path, pcd)
            print(f"Point cloud saved", file=sys.stderr)
            
            # Create mesh
            print("Creating mesh...", file=sys.stderr)
            mesh_created = False
            
            if use_poisson:
                try:
                    mesh, densities = o3d.geometry.TriangleMesh.create_from_point_cloud_poisson(
                        pcd, depth=9 if self.quality == 'high' else 8, 
                        width=0, scale=1.1, linear_fit=False
                    )
                    if len(densities) > 0:
                        vertices_to_remove = densities < np.quantile(densities, 0.04)
                        mesh.remove_vertices_by_mask(vertices_to_remove)
                    mesh.remove_degenerate_triangles()
                    mesh.remove_duplicated_triangles()
                    mesh.remove_duplicated_vertices()
                    mesh_created = True
                    print(f"Poisson mesh created", file=sys.stderr)
                except Exception as e:
                    print(f"Poisson failed: {e}", file=sys.stderr)
            
            if not mesh_created:
                try:
                    radii = [0.003, 0.006, 0.012, 0.024] if self.quality == 'high' else [0.005, 0.01, 0.02, 0.04]
                    mesh = o3d.geometry.TriangleMesh.create_from_point_cloud_ball_pivoting(
                        pcd, o3d.utility.DoubleVector(radii)
                    )
                    mesh_created = True
                    print(f"Ball pivoting mesh created", file=sys.stderr)
                except Exception as e:
                    print(f"Ball pivoting failed: {e}", file=sys.stderr)
            
            if not mesh_created:
                mesh = o3d.geometry.TriangleMesh()
                mesh.vertices = pcd.points
                if pcd.has_colors():
                    mesh.vertex_colors = pcd.colors
                print("Using point cloud as mesh", file=sys.stderr)
            
            # Rotate
            if len(mesh.vertices) > 0:
                rotation = mesh.get_rotation_matrix_from_xyz((np.pi, 0, 0))
                mesh.rotate(rotation, center=(0, 0, 0))
            
            # Save mesh
            mesh_path = os.path.join(output_dir, "mesh.ply")
            o3d.io.write_triangle_mesh(mesh_path, mesh)
            print(f"Mesh saved", file=sys.stderr)
            
            # Export for web
            web_data = self.export_for_web(pcd, mesh, output_dir)
            
            processing_time = time.time() - start_time
            print(f"Completed in {processing_time:.2f} seconds", file=sys.stderr)
            
            return {
                "success": True,
                "depth_map": depth_map_path,
                "point_cloud": pcd_path,
                "mesh": mesh_path,
                "web_ready": web_data,
                "processing_time": processing_time,
                "stats": {
                    "points": len(pcd.points),
                    "triangles": len(mesh.triangles) if mesh.has_triangles() else 0,
                    "vertices": len(mesh.vertices)
                }
            }
            
        except Exception as e:
            print(f"Error: {str(e)}", file=sys.stderr)
            
            # AUTO-FALLBACK
            if self.quality == 'high' and retry_with_fallback:
                print("⚠️ High quality failed, retrying with medium quality...", file=sys.stderr)
                self.quality = 'medium'
                return self.process_image(image_path, output_dir, retry_with_fallback=False)
            
            import traceback
            traceback.print_exc(file=sys.stderr)
            return {"success": False, "error": str(e)}
    
    def export_for_web(self, pcd, mesh, output_dir):
        try:
            # Convert to numpy arrays
            points = np.asarray(pcd.points)
            if pcd.has_colors():
                colors = np.asarray(pcd.colors)
            else:
                colors = np.ones((len(points), 3)) * 0.7
            
            vertices = np.asarray(mesh.vertices)
            if mesh.has_triangles():
                triangles = np.asarray(mesh.triangles)
            else:
                triangles = np.array([], dtype=np.int32).reshape(0, 3)
            
            if mesh.has_vertex_colors():
                mesh_colors = np.asarray(mesh.vertex_colors)
            else:
                mesh_colors = np.ones((len(vertices), 3)) * 0.7
            
            # FIXED: Clean list conversion
            def clean_list(arr):
                """Convert numpy array to clean Python list"""
                if arr is None or len(arr) == 0:
                    return []
                
                # Handle different dimensions
                if len(arr.shape) == 1:
                    return [float(x) if not np.isnan(x) and not np.isinf(x) else 0.0 for x in arr]
                elif len(arr.shape) == 2:
                    result = []
                    for row in arr:
                        clean_row = [float(x) if not np.isnan(x) and not np.isinf(x) else 0.0 for x in row]
                        result.append(clean_row)
                    return result
                elif len(arr.shape) == 3:
                    result = []
                    for face in arr:
                        face_list = [int(x) for x in face]
                        result.append(face_list)
                    return result
                else:
                    return []
            
            # Build data structure
            data = {
                "points": clean_list(points),
                "point_colors": clean_list(colors),
                "mesh_vertices": clean_list(vertices),
                "mesh_faces": clean_list(triangles),
                "mesh_colors": clean_list(mesh_colors),
                "bounding_box": {
                    "min": [float(x) for x in np.min(points, axis=0)] if len(points) > 0 else [0.0, 0.0, 0.0],
                    "max": [float(x) for x in np.max(points, axis=0)] if len(points) > 0 else [1.0, 1.0, 1.0],
                    "center": [float(x) for x in ((np.min(points, axis=0) + np.max(points, axis=0)) / 2)] if len(points) > 0 else [0.5, 0.5, 0.5],
                    "scale": float(np.max(np.max(points, axis=0) - np.min(points, axis=0))) if len(points) > 0 else 1.0
                },
                "metadata": {
                    "point_count": int(len(points)),
                    "triangle_count": int(len(triangles)) if len(triangles.shape) > 1 else 0,
                    "vertex_count": int(len(vertices)),
                    "version": "1.0"
                }
            }
            
            # CRITICAL FIX: Use dumps() to get string first, then write
            json_path = os.path.join(output_dir, "model_data.json")
            json_string = json.dumps(data, separators=(',', ':'))
            
            # Write the exact string without any extra characters
            with open(json_path, "w", encoding='utf-8') as f:
                f.write(json_string)
                f.flush()
                os.fsync(f.fileno())  # Force write to disk
            
            # Verify the file
            if os.path.exists(json_path):
                file_size = os.path.getsize(json_path) / 1024 / 1024
                print(f"Web data saved: {file_size:.2f} MB", file=sys.stderr)
                
                # Validate JSON by reading it back
                try:
                    with open(json_path, "r", encoding='utf-8') as f:
                        test_data = json.load(f)
                    print(f"JSON validation: OK", file=sys.stderr)
                except Exception as e:
                    print(f"JSON validation failed: {e}", file=sys.stderr)
            
            return json_path
            
        except Exception as e:
            print(f"Export error: {str(e)}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            
            # Create minimal valid JSON as fallback
            fallback_data = {
                "points": [],
                "point_colors": [],
                "mesh_vertices": [],
                "mesh_faces": [],
                "mesh_colors": [],
                "bounding_box": {"min": [0,0,0], "max": [1,1,1], "center": [0.5,0.5,0.5], "scale": 1.0},
                "metadata": {"point_count": 0, "triangle_count": 0, "vertex_count": 0, "version": "1.0"}
            }
            json_path = os.path.join(output_dir, "model_data.json")
            json_string = json.dumps(fallback_data)
            with open(json_path, "w", encoding='utf-8') as f:
                f.write(json_string)
                f.flush()
            return json_path


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"success": False, "error": "Usage: python depth_estimator.py <image_path> <output_dir>"}))
        sys.exit(1)
    
    image_path = sys.argv[1]
    output_dir = sys.argv[2]
    
    os.makedirs(output_dir, exist_ok=True)
    
    estimator = DepthEstimator(quality='high')
    result = estimator.process_image(image_path, output_dir)
    
    print(json.dumps(result))