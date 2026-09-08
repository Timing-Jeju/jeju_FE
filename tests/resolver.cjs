// Metro accepts density-only assets; Jest's default resolver needs the real filename.
module.exports = (request, options) => {
  try {
    return options.defaultResolver(request, options);
  } catch (error) {
    if (!request.endsWith('.png')) throw error;
    for (const density of ['@3x', '@2x']) {
      try {
        return options.defaultResolver(
          request.replace(/\.png$/, `${density}.png`),
          options,
        );
      } catch {}
    }
    throw error;
  }
};
