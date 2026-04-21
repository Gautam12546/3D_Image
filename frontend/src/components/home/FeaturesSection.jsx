import React from 'react';
import { motion } from 'framer-motion';
import { 
  FiZap, 
  FiCpu, 
  FiShield, 
  FiDownload, 
  FiShare2, 
  FiCloud,
  FiLayers,
  FiMaximize,
  FiCamera
} from 'react-icons/fi';

const features = [
  {
    icon: <FiZap className="w-8 h-8" />,
    title: "Lightning Fast",
    description: "Convert images to 3D models in seconds with our optimized AI pipeline using GPU acceleration.",
    color: "from-yellow-400 to-orange-500"
  },
  {
    icon: <FiCpu className="w-8 h-8" />,
    title: "Advanced AI",
    description: "State-of-the-art depth estimation using GLPN neural networks for accurate 3D reconstruction.",
    color: "from-blue-400 to-cyan-500"
  },
  {
    icon: <FiShield className="w-8 h-8" />,
    title: "Secure & Private",
    description: "Your images are encrypted and automatically deleted after processing. Your privacy matters.",
    color: "from-green-400 to-emerald-500"
  },
  {
    icon: <FiDownload className="w-8 h-8" />,
    title: "Multiple Formats",
    description: "Export your 3D models in PLY, OBJ, STL formats or view directly in browser with WebGL.",
    color: "from-purple-400 to-pink-500"
  },
  {
    icon: <FiShare2 className="w-8 h-8" />,
    title: "Easy Sharing",
    description: "Share your 3D creations with anyone via a simple link. Collaborate with team members.",
    color: "from-red-400 to-rose-500"
  },
  {
    icon: <FiCloud className="w-8 h-8" />,
    title: "Cloud Storage",
    description: "Access your conversion history from anywhere. Your models are safely stored in the cloud.",
    color: "from-indigo-400 to-purple-500"
  },
  {
    icon: <FiLayers className="w-8 h-8" />,
    title: "High Quality Mesh",
    description: "Generate detailed 3D meshes with Poisson surface reconstruction for professional results.",
    color: "from-pink-400 to-red-500"
  },
  {
    icon: <FiMaximize className="w-8 h-8" />,
    title: "HD Resolution Support",
    description: "Process images up to 4K resolution with automatic optimization for best results.",
    color: "from-teal-400 to-green-500"
  },
  {
    icon: <FiCamera className="w-8 h-8" />,
    title: "Real-time Preview",
    description: "Interactive 3D viewer with orbit controls, zoom, and multiple viewing modes.",
    color: "from-amber-400 to-yellow-500"
  }
];

const FeaturesSection = () => {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 bg-blue-100 text-blue-600 rounded-full text-sm font-semibold mb-4"
          >
            WHY CHOOSE US
          </motion.span>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Powerful Features for
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {" "}Professional Results
            </span>
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Everything you need to create stunning 3D models from your 2D images
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="group relative p-6 bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`} />
              
              <div className={`w-14 h-14 mb-5 rounded-xl bg-gradient-to-br ${feature.color} p-3 text-white shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                {feature.icon}
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              
              <p className="text-gray-600 leading-relaxed text-sm">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;