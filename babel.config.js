require('dotenv').config();

module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            [
                'module:react-native-dotenv', // Enables .env support in React Native
                {
                    moduleName: '@env',
                    path: '.env',
                },
            ],
        ],
    };
};
