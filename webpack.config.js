const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = (env) => {
  return {
    mode: env.production ? 'production' : 'development',
    entry: './src/index.js',
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    devServer: {
      static: './dist'
    },
    optimization: {
      runtimeChunk: 'single'
    },
    plugins: [
      new HtmlWebpackPlugin({
        title: 'reddlist',
        template: './src/index.html'
      })
    ],
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader']
        },
        {
          test: /\.html&/i,
          use: 'html-loader'
        }
      ]
    },
    externals: {
      markdownit: 'markdownit'
    }
  }
}
