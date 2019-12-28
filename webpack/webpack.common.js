const webpack = require('webpack');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv').config({
  path: path.join(__dirname, '..', 'src', 'frontend', '.env'),
});

const CopyPlugin = require('copy-webpack-plugin');
const srcDir = '../src/';

const moduleNameToPath = libName =>
  `${path.resolve(__dirname, `../node_modules/${libName}`)}/`;

module.exports = {
  entry: {
    background: path.join(__dirname, srcDir + 'background.ts'),
    content_script: path.join(__dirname, srcDir + 'content_script.tsx'),
  },
  output: {
    path: path.join(__dirname, '../dist/'),
    filename: 'js/[name].js',
  },
  optimization: {
    splitChunks: {
      name: 'vendor',
      chunks: 'initial',
    },
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        include: ['semantic-ui-css'].map(moduleNameToPath),
        use: ['to-string-loader', 'css-loader'],
      },
      {
        test: /\.(eot|ttf|woff|woff2|svg|png|jpg)$/,
        loader: 'url-loader',
      },
      {
        test: /\.ts(x?)$/,
        exclude: /node_modules/,
        loader: 'ts-loader',
      },
      {
        enforce: 'pre',
        test: /\.js$/,
        loader: 'source-map-loader',
      },
    ],
  },

  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
  },
  plugins: [
    new CopyPlugin([
      {
        from: './public',
        to: './',
        transform: (content, filePath) => {
          if (
            path.resolve(path.join('./public', 'manifest.json')) === filePath
          ) {
            const { version, description } = JSON.parse(
              fs.readFileSync(path.join(__dirname, '..', 'package.json')),
            );

            content = JSON.parse(content.toString());
            content.version = version;
            content.description = description;

            return JSON.stringify(content, null, 2);
          }
          return content;
        },
      },
    ]),
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(dotenv.parsed),
    }),
  ],
};
