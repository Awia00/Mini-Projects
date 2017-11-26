const merge = require('webpack-merge');
const common = require('./webpack.config.js');
var path = require('path');

module.exports = merge(common, {
    devtool: 'inline-source-map',
    devServer: {
        contentBase: path.join(process.cwd(), 'dist'),
        clientLogLevel: 'info',
        port: 8080,
        inline: true,
        historyApiFallback: false,
        watchOptions: {
                aggregateTimeout: 300,
                poll: 500,
        },
    },
});