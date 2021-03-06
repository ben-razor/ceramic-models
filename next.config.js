module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    config.module.rules.push({
      test: /\.md$/,
      use: 'raw-loader',
    });

    config.module.rules.push({
      test: /\.txt$/, 
      use: 'raw-loader',
    });
    return config;
  }
}
