var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var glob = require('glob');
var rimraf = require('rimraf');
var gulp = require('gulp');
var log = require('fancy-log');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var header = require('gulp-header');
var handlebars = require('handlebars');

var DEP_MATHJS        = './node_modules/mathjs'
var DEP_MATHJS_SRC    = './mathjs-src'
var LIB_SRC           = DEP_MATHJS + '/lib/browser/*';
var LIB_DEST          = './js/lib';
var DOCS_SRC          = DEP_MATHJS_SRC + '/docs/**/*.md';
var DOCS_DEST         = './docs';
var EXAMPLES_SRC      = DEP_MATHJS_SRC + '/examples/**/*';
var EXAMPLES_DEST     = './examples';
var HISTORY_SRC       = DEP_MATHJS_SRC + '/HISTORY.md';
var HISTORY_DEST      = '.';
var MATHJS            = LIB_DEST + '/math.js';
var DOWNLOAD          = './download.md';

var MD_HEADER =
    '---\n' +
    'layout: default\n' +
    '---\n' +
    '\n';

var EXAMPLE_TEMPLATE = MD_HEADER +
    '# {{title}}\n\n' +
    '{{#each files}}' +
    'File: [{{url}}]({{url}}){{#if_eq type "html"}} (click for a live demo){{/if_eq}}\n\n' +
    '```{{type}}\n' +
    '{{{code}}}' +
    '\n```\n\n' +
    '{{/each}}' +
    '<!-- Note: This file is automatically generated. Changes made in this file will be overridden. -->\n\n';

var INDEX_TEMPLATE = MD_HEADER +
    '# Examples\n\n' +
    '{{#each files}}' +
    '- [{{title}}]({{url}})\n' +
    '{{/each}}' +
    '\n' +
    '\n' +
    '# Browser examples\n\n' +
    '{{#each browserFiles}}' +
    '- [{{title}}]({{url}})\n' +
    '{{/each}}' +
    '\n' +
    '\n' +
    '# Advanced examples\n\n' +
    '{{#each advancedFiles}}' +
    '- [{{title}}]({{url}})\n' +
    '{{/each}}' +
    '\n' +
    '\n' +
    '<!-- Note: This file is automatically generated. Changes made in this file will be overridden. -->\n\n';

// source: https://stackoverflow.com/questions/15088215/handlebars-js-if-block-helper
handlebars.registerHelper('if_eq', function(a, b, opts) {
  if(a === b)
    return opts.fn(this);
  else
    return opts.inverse(this);
});

// get version of math.js
function version() {
  return require('mathjs/package.json').version;
}

// inject permalinks in markdown files in a gulp pipe
var fn = function (header, level, title) {
  // for example:
  //   header is '## My Header',
  //   level is '##',
  //   title is 'My Header'
  var tag = 'h' + level.length;                       // for example 'h2'
  var id = title.toLowerCase()                        // for example 'my-header'
      .replace(/[^\w\s]/g, '')
      .replace(/\s/g, '-');
  var link = '<a href="#' + id + '" title="Permalink">#</a>'; // clickable link to header

  // returns for example '<h2 id="my-header">My Header <a href="#my-header" title="Permalink">#</a></h2>'
  return '<' + tag + ' id="' + id + '">' + title + ' ' + link + '</' + tag + '>';
};
var injectPermalinks = replace(/^(#+) (.*)$/mg, fn);
var injectPermalinks2 = replace(/^(#+) (.*)$/mg, fn);
var injectClickableIssueTags = replace(/([ (])(#(\d+))/mg, function (match, pre, tag, number) {
  return pre + '<a href="https://github.com/josdejong/mathjs/issues/' + number + '">' + tag + '</a>'
});
var injectClickableUserTags = replace(/ (@([0-9a-zA-Z_-]+))/mg, function (match, tag, username) {
  return ' <a href="https://github.com/' + username + '">' + tag + '</a>'
});

/**
 * Verify whether we have the same version numbers in both mathjs and mathjs-src
 *
 * The mathjs library itself is purely used to validate whether the library
 * is published and whether we've an up-to-date version of the master branch
 * with the source code.
 */
gulp.task('verify', function (cb) {
  const mathjsVersion = require(DEP_MATHJS + '/package.json').version;
  const mathjsSrcVersion = require(DEP_MATHJS_SRC + '/package.json').version;

  if (mathjsVersion !== mathjsSrcVersion) {
    throw new Error('Version numbers of mathjs and mathjs-src do not correspond'+
      `(mathjs: ${mathjsVersion}, mathjs-src: ${mathjsSrcVersion})`);
  }

  cb();
});

/**
 * copy math.js
 */
gulp.task('copy', function () {
  return gulp.src(LIB_SRC)
      .pipe(gulp.dest(LIB_DEST));
});

/**
 * Clean all examples and docs
 */
gulp.task('clean', async function () {
  await rimraf(DOCS_DEST);
  await rimraf(EXAMPLES_DEST);
});

/**
 * Import docs and preprocess them for the static HTML web page:
 * - Add a markdown header containing the layout page
 * - Replace internal links to other markdown documents with *.html
 */
gulp.task('docs', function () {
  return gulp.src(DOCS_SRC)
      .pipe(replace(/HISTORY.md/g, 'history.html'))         // change links to history.md to lowercase
      .pipe(replace(/(\([\w\./]*).md([)#])/g, '$1.html$2')) // replace urls to *.md with *.html
      .pipe(injectPermalinks)                               // create headers with an id
      .pipe(header(MD_HEADER))                              // add banner with markdown layout
      .pipe(gulp.dest(DOCS_DEST));
});

/**
 * Copy all examples
 */
gulp.task('copyExamples', function () {
  // TODO: make these script replacements more robust
  var script = 'https://unpkg.com/mathjs@' + version() + '/lib/browser/math.js';
  console.log('copy examples', version(), { url: script })
  return gulp.src(EXAMPLES_SRC)
      .pipe(replace(/src=".*lib\/browser\/math.js"/, 'src="' + script + '"'))
      .pipe(replace(/'.*lib\/browser\/math.js'/, "'" + script + "'"))
      .pipe(replace("from '../lib/esm/index.js'", "from 'mathjs'"))
      .pipe(replace("from '../../lib/esm/index.js'", "from 'mathjs'"))
      .pipe(replace("from '../../lib/esm/number.js'", "from 'mathjs/number'"))
      .pipe(gulp.dest(EXAMPLES_DEST));
});

/**
 * Create markdown pages for every example
 */
gulp.task('markdownExamples', function (cb) {
  var template = handlebars.compile(EXAMPLE_TEMPLATE);

  function createPage (files, title, url) {
    if (!Array.isArray(files)) {
      files = [files];
    }

    var page = template({
      title: title,                               // for example 'Basic usage'
      files: files
          .sort(function (a, b) {
            if (path.basename(a) == 'index.js' || path.basename(a) == 'index.html') return -1;
            if (path.basename(b) == 'index.js' || path.basename(b) == 'index.html') return 1;
            return 0;
          })
          .map(function (file) {
            return {
              url: path.basename(file),               // for example 'basic_usage.js'
              type: path.extname(file).substring(1),  // for example 'js'
              code: fs.readFileSync(file)             // the actual code contents
            };
      })
    });

    // TODO: inject permalinks

    fs.writeFileSync(url, page);
  }

  function generate(pattern, callback) {
    glob(EXAMPLES_DEST + '/' + pattern, function (err, files) {
      files.sort();

      var results = files.map(function (file) {
        var isDir = fs.statSync(file).isDirectory();
        var extension = path.extname(file);
        var title = path.basename(file, extension)  // filename without extension
            .replace(/^\w/g, function (c) { // replace first character with upper case letter
              return c.toUpperCase();
            })
            .replace(/_/g, ' ');  // replace underscores with spaces

        if (isDir) {
          var files = fs.readdirSync(file).map(function (f) {
            return file + '/' + f;
          });
          file = file + '/index';
          createPage(files, title, file + '.md');
        }
        else {
          createPage(file, title, file + '.md');
        }

        return {
          title: title,                                     // for example 'Basic usage'
          url: path.relative(EXAMPLES_DEST, file + '.html') // for example 'basic_usage.js.html'
        };
      });

      callback(results);
    })
  }

  // TODO: write a more generic script for this
  generate('*.js', function (files) {
    generate('browser/*', function (browserFiles) {
    generate('advanced/*', function (advancedFiles) {
        // create an index page
        var template = handlebars.compile(INDEX_TEMPLATE);
        var page = template({
          files: files,
          browserFiles: browserFiles,
          advancedFiles: advancedFiles
        });
        // TODO: inject permalinks

        fs.writeFileSync(EXAMPLES_DEST + '/index.md', page);

        cb();
      });
    });
  });
});

/**
 * Copy and preprocess the history file
 */
gulp.task('history', function () {
  return gulp.src(HISTORY_SRC)
      .pipe(header(MD_HEADER))    // add header with markdown layout
      .pipe(injectClickableIssueTags) // must be done before injectPermalinks
      .pipe(injectClickableUserTags)  // must be done before injectPermalinks
      .pipe(injectPermalinks2)
      .pipe(rename('history.md')) // rename to lower case
      .pipe(gulp.dest(HISTORY_DEST));
});

/**
 * Update size and version number on the downloads page
 */
gulp.task('version', function (cb) {
  // get (gzipped) bundle size
  function productionSize(callback) {
    fs.readFile(MATHJS, function (err, data) {
      if (!err) {
        zlib.gzip(data, function (err, data) {
          if (!err) {
            var size = Math.round(data.length / 1024) + ' kB';
            callback(null, size)
          }
          else {
            callback(err);
          }
        });
      }
      else {
        callback(err);
      }
    });
  }

  // update version and library sizes in index.md
  function updateVersion(productionSize, callback) {
    log('bundle size: ' + productionSize);
    log('version: ' + version());

    fs.readFile(DOWNLOAD, function (err, data) {
      if (!err) {
        data = String(data);

        // replace version
        data = data.replace(/\(version [0-9]+\.[0-9]+\.[0-9]+(-SNAPSHOT)?,/g, '(version ' + version() + ',');
        data = data.replace(/\/[0-9]+\.[0-9]+\.[0-9]+?(-SNAPSHOT)?\//g, '/' + version() + '/');
        data = data.replace(/\/mathjs@[0-9]+\.[0-9]+\.[0-9]+?(-SNAPSHOT)?\//g, '/mathjs@' + version() + '/');

        // replace bundle size
        data = data.replace(/<span id="size">([\w\s]*)<\/span>/g,
                '<span id="size">' + productionSize + '</span>');

        fs.writeFile(DOWNLOAD, data, callback);
      }
      else {
        callback(err);
      }
    });
  }

  productionSize(function (err, prodSize) {
    if (prodSize) {
      updateVersion(prodSize, cb);
    }
    else {
      cb(new Error('Failed to calculate development size or production size'));
    }
  });
});

gulp.task('default', gulp.series(
    'verify',
    'clean',
    'copy',
    'docs',
    'copyExamples',
    'markdownExamples',
    'history',
    'version'
));
