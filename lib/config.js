"use strict";
exports.defaults = function() {
  return {
    browserify: {
      bundles: [
        {
          entries: ['javascripts/main.js'],
          outputFile: 'bundle.js'
        }
      ],
      debug: true,
      shims: {},
      aliases: {},
      noParse: []
    }
  };
};

exports.placeholder = function() {
  return "# browserify:\n#   bundles: [                          # add one or more bundles with one or more entry points\n#     entries: ['javascripts/main.js']\n#     outputFile: 'bundle.js' ]\n#   debug: true                         # true for sourcemaps\n#   shims: {}                           # add any number of shims you neeed\n#                                       # see https://github.com/thlorenz/browserify-shim for config details\n#   aliases:\n#     dust: 'javascripts/vendor/dust'   # aliases allow you to require('alias') without having\n#                                       # to worry about relative paths. define as many as you need!\n#\n#   noParse:                            # an array of files you want browserify to skip parsing for.\n#     ['javascripts/vendor/jquery']     # useful for the big libs (jquery, ember, handlebars, dust, etc) that don't\n#                                       # need node environment vars (__process, global, etc). This can save\n#                                       # a significant amount of time when bundling.";
};

exports.validate = function(config, validators) {
  var bund, errors, _i, _len, _ref;
  errors = [];
  if (validators.ifExistsIsObject(errors, "browserify config", config.browserify)) {
    validators.ifExistsIsBoolean(errors, "browserify.debug", config.browserify.debug);
    validators.ifExistsIsObject(errors, "browserify.shims", config.browserify.shims);
    validators.ifExistsIsObject(errors, "browserify.aliases", config.browserify.aliases);
    validators.ifExistsIsArray(errors, "browserify.noParse", config.browserify.noParse);
    if (validators.isArray(errors, "browserify.bundles", config.browserify.bundles)) {
      _ref = config.browserify.bundles;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        bund = _ref[_i];
        if (validators.ifExistsIsObject(errors, "browserify.bundles entries", bund)) {
          if (bund.entries && Array.isArray(bund.entries)) {
            if (bund.entries.length === 0) {
              errors.push("browserify.bundles.entries array cannot be empty.");
            } else {
              validators.isArrayOfStrings(errors, "browserify.bundles.entries", bund.entries);
            }
          } else {
            errors.push("Each browserify.bundles entry must contain an entries array");
          }
          if (bund.outputFile) {
            validators.isString(errors, "browserify.bundles.outputFile", bund.outputFile);
          } else {
            errors.push("Each browserify.bundles entry must contain an outputFile string");
          }
        }
      }
    }
  }
  return errors;
};
