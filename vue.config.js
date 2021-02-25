const StyleLintPlugin = require('stylelint-webpack-plugin');

module.exports = {
  configureWebpack: { plugins: [ new StyleLintPlugin({ files: [ 'src/**/*.{vue,css}' ] }) ] },
  devServer: {
    host: '0.0.0.0',
    disableHostCheck: true,
  },
  filenameHashing: process.env.NODE_ENV !== 'production',
  transpileDependencies: [ 'vuetify' ],
};
