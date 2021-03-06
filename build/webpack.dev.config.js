const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

const merge = require('webpack-merge');
const webpackBaseConfig = require('./webpack.base.config.js');
const fs = require('fs');
const path = require('path');

fs.open('./src/config/env.js', 'w', function (err, fd) {
  const buf = 'export default "development";';
  // fix node v10 bug with callback error: TypeError [ERR_INVALID_CALLBACK]: Callback must be a function
  fs.write(fd, buf, function(err, written, buffer) {});
});

module.exports = merge(webpackBaseConfig, {
  mode: 'development',
  devtool: '#source-map',
  output: {
    publicPath: '/',
    filename: '[name].js',
    chunkFilename: '[name].chunk.js'
  },
  optimization: {
    splitChunks: {
      cacheGroups: {
        vendor: {
          chunks: "initial",
          test: path.resolve(__dirname, "node_modules"),
          name: "vendor",
          enforce: true
        }
      }
    }
  },
  plugins: [
    new ExtractTextPlugin({
      filename: '[name].css',
      allChunks: true
    }),
    // new webpack.optimize.CommonsChunkPlugin({
    //     name: 'vendors',
    //     filename: 'vendors.js'
    // }),
    new HtmlWebpackPlugin({
      filename: '../views/admin.hbs',
      template: './src/template/index.ejs',
      inject: false
    })
  ]
});
