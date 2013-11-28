"use strict";
var browserify, config, fs, logger, path, registration, shim, through, wrench, _, _browserify, _bundleCallback, _clean, _cleanUpBuild, _fixShims, _isShimmedAndNotParsed, _makeAliases, _makeShims, _normalizePath, _whenDone,
  __slice = [].slice;

_ = require('lodash');

browserify = require('browserify');

fs = require('fs');

logger = require('logmimosa');

path = require('path');

shim = require('browserify-shim');

through = require('through');

wrench = require('wrench');

config = require('./config');

registration = function(mimosaConfig, register) {
  var cfg, e, name, _ref, _results;
  e = mimosaConfig.extensions;
  register(['postClean'], 'init', _clean);
  register(['add', 'update', 'remove'], 'afterWrite', _browserify, __slice.call(e.javascript).concat(__slice.call(e.template)));
  register(['postBuild'], 'optimize', _browserify);
  _ref = mimosaConfig.browserify.shims;
  _results = [];
  for (name in _ref) {
    cfg = _ref[name];
    _results.push(cfg.path = path.join(mimosaConfig.watch.compiledDir, cfg.path));
  }
  return _results;
};

_clean = function(mimosaConfig, options, next) {
  var bundleConfig, bundlePath, outputFile, _i, _len, _ref;
  _ref = mimosaConfig.browserify.bundles;
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    bundleConfig = _ref[_i];
    outputFile = bundleConfig.outputFile;
    bundlePath = path.join(mimosaConfig.watch.compiledJavascriptDir, outputFile);
    if (fs.existsSync(bundlePath)) {
      fs.unlinkSync(bundlePath);
      logger.success("Browserify - Removed bundle [[ " + outputFile + " ]]");
    }
  }
  return next();
};

_browserify = function(mimosaConfig, options, next) {
  var b, browerifyOptions, browserifyConfig, bundle, bundleCallback, bundleConfig, bundlePath, bundledFiles, ctorOptions, entry, outputFile, plural, root, whenDone, _i, _j, _len, _len1, _ref, _ref1, _ref2, _ref3, _results;
  root = mimosaConfig.watch.compiledDir;
  browserifyConfig = mimosaConfig.browserify;
  plural = browserifyConfig.bundles.length > 1;
  logger.info("Browserify - Creating bundle" + (plural ? 's' : ''));
  bundledFiles = [];
  whenDone = _whenDone(mimosaConfig, bundledFiles, next);
  _ref = browserifyConfig.bundles;
  _results = [];
  for (_i = 0, _len = _ref.length; _i < _len; _i++) {
    bundleConfig = _ref[_i];
    outputFile = bundleConfig.outputFile;
    bundlePath = path.join(mimosaConfig.watch.compiledJavascriptDir, outputFile);
    browerifyOptions = {
      debug: (_ref1 = (_ref2 = bundleConfig.debug) != null ? _ref2 : browserifyConfig.debug) != null ? _ref1 : true
    };
    ctorOptions = {
      noParse: _.map(browserifyConfig.noParse, function(f) {
        return path.join(root, f);
      })
    };
    b = browserify(ctorOptions);
    b.on('file', function(fileName) {
      return bundledFiles.push(fileName);
    });
    _makeAliases(b, mimosaConfig);
    _makeShims(b, mimosaConfig, browserifyConfig.bundles);
    _fixShims(b, mimosaConfig);
    _ref3 = bundleConfig.entries;
    for (_j = 0, _len1 = _ref3.length; _j < _len1; _j++) {
      entry = _ref3[_j];
      b.add(path.join(root, entry));
    }
    bundleCallback = _bundleCallback(bundleConfig, bundlePath, whenDone);
    _results.push(bundle = b.bundle(browerifyOptions, bundleCallback));
  }
  return _results;
};

_makeAliases = function(browserifyInstance, mimosaConfig) {
  var aliases, b, k, root, v, _results;
  b = browserifyInstance;
  aliases = mimosaConfig.browserify.aliases;
  root = mimosaConfig.watch.compiledDir;
  if (aliases == null) {
    return;
  }
  _results = [];
  for (k in aliases) {
    v = aliases[k];
    _results.push(b.require(path.join(root, v), {
      expose: k
    }));
  }
  return _results;
};

_makeShims = function(browserifyInstance, mimosaConfig, bundleConfig) {
  var b, shims;
  b = browserifyInstance;
  shims = bundleConfig.shims != null ? _.pick(mimosaConfig.browserify.shims, bundleConfig.shims) : mimosaConfig.browserify.shims;
  return shim(b, shims);
};

_fixShims = function(browserifyInstance, mimosaConfig) {
  var b;
  b = browserifyInstance;
  return b.transform(function(file) {
    var data, end, write;
    if (!_isShimmedAndNotParsed(file, mimosaConfig)) {
      return through();
    }
    data = 'var global=self;';
    write = function(buffer) {
      return data += buffer;
    };
    end = function() {
      this.queue(data);
      return this.queue(null);
    };
    return through(write, end);
  });
};

_isShimmedAndNotParsed = function(file, mimosaConfig) {
  var browserifyConfig, noParsePaths, shimmedAndNotParsed, shimmedPaths;
  file = _normalizePath(file);
  browserifyConfig = mimosaConfig.browserify;
  shimmedPaths = [];
  _.forIn(browserifyConfig.shims, function(v, k) {
    return shimmedPaths.push(_normalizePath(v.path));
  });
  noParsePaths = _.map(browserifyConfig.noParse, function(f) {
    return _normalizePath(path.join(mimosaConfig.watch.compiledDir, f));
  });
  shimmedAndNotParsed = _.contains(shimmedPaths, file) && _.contains(noParsePaths, file);
  logger.debug("[[ " + file + " ]] _isShimmedAndNotParsed :: " + shimmedAndNotParsed);
  return shimmedAndNotParsed;
};

_normalizePath = function(file) {
  if (path.extname(file) === '.js') {
    file = file.slice(0, -3);
  }
  return file;
};

_whenDone = function(mimosaConfig, bundledFiles, next) {
  var bundlesComplete, numBundles;
  numBundles = mimosaConfig.browserify.bundles.length;
  bundlesComplete = 0;
  return function() {
    bundlesComplete += 1;
    if (bundlesComplete === numBundles) {
      if (mimosaConfig.isBuild) {
        _cleanUpBuild(mimosaConfig, bundledFiles);
      }
      return next();
    }
  };
};

_cleanUpBuild = function(mimosaConfig, bundledFiles) {
  var compDir, directories, f, _i, _len;
  bundledFiles = _.uniq(bundledFiles);
  for (_i = 0, _len = bundledFiles.length; _i < _len; _i++) {
    f = bundledFiles[_i];
    if (fs.existsSync(f)) {
      fs.unlinkSync(f);
    }
  }
  compDir = mimosaConfig.watch.compiledDir;
  directories = wrench.readdirSyncRecursive(compDir).filter(function(f) {
    return fs.statSync(path.join(compDir, f)).isDirectory();
  });
  return _.sortBy(directories, 'length').reverse().map(function(dir) {
    return path.join(compDir, dir);
  }).forEach(function(dirPath) {
    var err;
    if (fs.existsSync(dirPath)) {
      try {
        fs.rmdirSync(dirPath);
        return logger.debug("Deleted empty directory [[ " + dirPath + " ]]");
      } catch (_error) {
        err = _error;
        if (err.code === 'ENOTEMPTY') {
          return logger.debug("Unable to delete directory [[ " + dirPath + " ]] because directory not empty");
        } else {
          logger.error("Unable to delete directory, [[ " + dirPath + " ]]");
          return logger.error(err);
        }
      }
    }
  });
};

_bundleCallback = function(bundleConfig, bundlePath, complete) {
  return function(err, src) {
    if (err != null) {
      logger.error("Browserify [[ " + bundleConfig.outputFile + " ]] - " + err);
    } else if (src != null) {
      fs.writeFileSync(bundlePath, src);
      logger.success("Browserify - Created bundle [[ " + bundleConfig.outputFile + " ]]");
    }
    return complete();
  };
};

module.exports = {
  registration: registration,
  defaults: config.defaults,
  placeholder: config.placeholder,
  validate: config.validate
};
