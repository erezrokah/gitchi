const merge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  devtool: 'inline-source-map',
  mode: 'development',
  //plugins: [new (require('webpack-bundle-analyzer')).BundleAnalyzerPlugin()],
});
