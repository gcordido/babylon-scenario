const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");
const path = require('path');

module.exports = {
    entry:'./src/game.ts',

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js'
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    mode: "development", //added to debug in the future, change to production later
    devtool: 'eval-cheap-source-map',
    plugins: [
        new HtmlWebpackPlugin({
            title: "Babylon Scenario",
            template: "./src/index.html"
        }),
        new CopyPlugin({
            patterns: [
              { from: "public", to: "" },
            ],
        }),
    ],
    module: {
        rules: [{
            test: /\.tsx?$/,
            loader: 'ts-loader',
            exclude: /node_modules/
        }]
    }
}