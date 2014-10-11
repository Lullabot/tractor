'use strict';

/* Directives */

angular.module('ngTractor')
  .directive('partial', function($compile) {
    return {
      restrict: "E",
      scope: {repeating : "@"},
      templateUrl: function($element, $attrs) {
        var template ='views/partials/' + $attrs.file + '.html';
        return template;
      },
      replace: true,
    }
  })
  .directive('ui', function($compile) {
    return {
      restrict: "E",
      scope: {repeating : "@"},
      templateUrl: function($element, $attrs) {
        var template ='views/ui/' + $attrs.file + '.html';
        return template;
      },
      replace: true,
    }
  })
  .directive('layout', function($http, $compile) {
    return {
      restrict: "E",
      compile: function(tEl, tAttr) {
        // GET template at this point, since we cannot pre-load as before.
        var getTemplate = $http.get('/views/layouts/' + tAttr.file + '.html');

        // This will contain all the HTML regions from the "transcluded" section.
        var _regions = {};

        angular.forEach(tEl.children(), function(region) {
          // wrap tEl.children() elements in jqLite
          var _region = angular.element(region);

          // if it's a region element, save the HTML and remove the node.
          if(_region.prop("tagName") == "REGION") {
            _regions[_region.attr("name")] = _region.html();
            _region.remove();
          }
        });


        return function(scope, el, attr) {

          var newTemplate;

          // Interact with the $http promise above.
          // This needs to happen in the linking function, since we
          // don't want to start _ANYTHING_ until we get the template back.
          getTemplate.then(function(template) {
            // Wrap template in jqLite...
            newTemplate = angular.element(template.data);

            angular.forEach(newTemplate.find('*'), function(region) {
              // wrap newTemplate.children() in jqLite.
              var _region = angular.element(region);

              // if it's a region element AND we have a "transcluded" HTML fragment,
              // replace HTML.
              if(_region.attr("region") && angular.isDefined(_regions[_region.attr("region")])) {

                _region.html(_regions[_region.attr("region")]);
              }
            });

            // $compile and append.
            el.append($compile(newTemplate)(scope));
          });
        };
      }
    }
  })
  .directive('repeat', function() {
    return {
      restrict: "A",
      compile: function(tElement, attrs) {
        var content = tElement.children();
        attrs.$observe('repeat', function(newVal) {
          for (var i=1; i<attrs.repeat; i++) {
            tElement.append(content.clone());
          }
        })
      },
    }
  })
  .directive( 'phImg', function () {
    return {
      restrict: 'A',
      scope: { dimensions: '@phImg',
               bgColor: '@',
               txtColor: '@',
               text: '@' },
      link: function( scope, element, attr ) {
        // A reference to a canvas that we can reuse
        var canvas;
        var bgColor = (attr.bgColor) ? attr.bgColor : "#CCCCCC";
        var txtColor = (attr.txtColor) ? attr.txtColor : "#959595";
        var text = (attr.text) ? attr.text : scope.dimensions;
        console.log(text);


        var config = {
          text_size: 10,
          fill_color: bgColor,
          text_color: txtColor,
          text: text
        };

        /**
         * When the provided dimensions change, re-pull the width and height and
         * then redraw the image.
         */
        scope.$watch('dimensions', function () {
          if( ! angular.isDefined( scope.dimensions ) ) {
              return;
          }
          var matches = scope.dimensions.match( /^(\d+)x(\d+)$/ ),
              dataUrl;

          if(  ! matches ) {
            console.error("Expected '000x000'. Got " + scope.dimensions);
            return;
          }

          // Grab the provided dimensions.
          scope.size = { w: matches[1], h: matches[2] };

          // FIXME: only add these if not already present
          element.prop( "title", scope.dimensions );
          element.prop( "alt", scope.dimensions );

          // And draw the image, getting the returned data URL.
          dataUrl = drawImage();

          // If this is an `img` tag, set the src as the data URL. Else, we set
          // the CSS `background-image` property to same.
          if ( element.prop( "tagName" ) === "IMG" ) {
            element.prop( 'src', dataUrl );
          } else {
            element.css( 'background-image', 'url("' + dataUrl + '")' );
          }
        });

        /**
         * Calculate the maximum height of the text we can draw, based on the
         * requested dimensions of the image.
         */
        function getTextSize() {
          var dimension_arr = [scope.size.h, scope.size.w].sort(),
              maxFactor = Math.round(dimension_arr[1] / 16);

          return Math.max(config.text_size, maxFactor);
        }

        /**
         * Using the HTML5 canvas API, draw a placeholder image of the requested
         * size with text centered vertically and horizontally that specifies its
         * dimensions. Returns the data URL that can be used as an `img`'s `src`
         * attribute.
         */
        function drawImage() {
          // Create a new canvas if we don't already have one. We reuse the canvas
          // when if gets redrawn so as not to be wasteful.
          canvas = canvas || document.createElement( 'canvas' );

          // Obtain a 2d drawing context on which we can add the placeholder
          // image.
          var context = canvas.getContext( '2d' ),
              text_size,
              text;

          // Set the canvas to the appropriate size.
          canvas.width = scope.size.w;
          canvas.height = scope.size.h;

          // Draw the placeholder image square.
          // TODO: support other shapes
          // TODO: support configurable colors
          context.fillStyle = config.fill_color;
          context.fillRect( 0, 0, scope.size.w, scope.size.h );

          // Add the dimension text.
          // TODO: support configurable font
          // FIXME: ensure text will fit and resize if it doesn't
          text_size = getTextSize();
          text = config.text;
          context.fillStyle = config.text_color;
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          context.font = 'bold '+text_size+'pt sans-serif';

          // If the text is too long to fit, reduce it until it will.
          if (context.measureText( text ).width / scope.size.w > 1) {
            text_size = config.text_size / (context.measureText( text ).width / scope.size.w);
            context.font = 'bold '+text_size+'pt sans-serif';
          }

          // Finally, draw the text in its calculated position.
          context.fillText( text, scope.size.w / 2, scope.size.h / 2 );

          // Get the data URL and return it.
          return canvas.toDataURL("image/png");
        }
      }
    };
  })
  .factory( 'TextGeneratorService', function () {
    var words = ["lorem", "ipsum", "dolor", "sit", "amet,", "consectetur", "adipiscing",
      "elit", "ut", "aliquam,", "purus", "sit", "amet", "luctus", "venenatis,",
      "lectus", "magna", "fringilla", "urna,", "porttitor", "rhoncus", "dolor",
      "purus", "non", "enim", "praesent", "elementum", "facilisis", "leo,", "vel",
      "fringilla", "est", "ullamcorper", "eget", "nulla", "facilisi", "etiam",
      "dignissim", "diam", "quis", "enim", "lobortis", "scelerisque", "fermentum",
      "dui", "faucibus", "in", "ornare", "quam", "viverra", "orci", "sagittis", "eu",
      "volutpat", "odio", "facilisis", "mauris", "sit", "amet", "massa", "vitae",
      "tortor", "condimentum", "lacinia", "quis", "vel", "eros", "donec", "ac",
      "odio", "tempor", "orci", "dapibus", "ultrices", "in", "iaculis", "nunc",
      "sed", "augue", "lacus,", "viverra", "vitae", "congue", "eu,", "consequat",
      "ac", "felis", "donec", "et", "odio", "pellentesque", "diam", "volutpat",
      "commodo", "sed", "egestas", "egestas", "fringilla", "phasellus", "faucibus",
      "scelerisque", "eleifend", "donec", "pretium", "vulputate", "sapien", "nec",
      "sagittis", "aliquam", "malesuada", "bibendum", "arcu", "vitae", "elementum",
      "curabitur", "vitae", "nunc", "sed", "velit", "dignissim", "sodales", "ut",
      "eu", "sem", "integer", "vitae", "justo", "eget", "magna", "fermentum",
      "iaculis", "eu", "non", "diam", "phasellus", "vestibulum", "lorem", "sed",
      "risus", "ultricies", "tristique", "nulla", "aliquet", "enim", "tortor,", "at",
      "auctor", "urna", "nunc", "id", "cursus", "metus", "aliquam", "eleifend", "mi",
      "in", "nulla", "posuere", "sollicitudin", "aliquam", "ultrices", "sagittis",
      "orci,", "a", "scelerisque", "purus", "semper", "eget", "duis", "at", "tellus",
      "at", "urna", "condimentum", "mattis", "pellentesque", "id", "nibh", "tortor,",
      "id", "aliquet", "lectus", "proin", "nibh", "nisl,", "condimentum", "id",
      "venenatis", "a,", "condimentum", "vitae", "sapien", "pellentesque",
      "habitant", "morbi", "tristique", "senectus", "et", "netus", "et", "malesuada",
      "fames", "ac", "turpis", "egestas", "sed", "tempus,", "urna", "et", "pharetra",
      "pharetra,", "massa", "massa", "ultricies", "mi,", "quis", "hendrerit",
      "dolor", "magna", "eget", "est", "lorem", "ipsum", "dolor", "sit", "amet,",
      "consectetur", "adipiscing", "elit", "pellentesque", "habitant", "morbi",
      "tristique", "senectus", "et", "netus", "et", "malesuada", "fames", "ac",
      "turpis", "egestas", "integer", "eget", "aliquet", "nibh", "praesent",
      "tristique", "magna", "sit", "amet", "purus", "gravida", "quis", "blandit",
      "turpis", "cursus", "in", "hac", "habitasse", "platea", "dictumst", "quisque",
      "sagittis,", "purus", "sit", "amet", "volutpat", "consequat,", "mauris",
      "nunc", "congue", "nisi,", "vitae", "suscipit", "tellus", "mauris", "a",
      "diam", "maecenas", "sed", "enim", "ut", "sem", "viverra", "aliquet", "eget",
      "sit", "amet", "tellus", "cras", "adipiscing", "enim", "eu", "turpis",
      "egestas", "pretium", "aenean", "pharetra,", "magna", "ac", "placerat",
      "vestibulum,", "lectus", "mauris", "ultrices", "eros,", "in", "cursus",
      "turpis", "massa", "tincidunt", "dui", "ut", "ornare", "lectus", "sit", "amet",
      "est", "placerat", "in", "egestas", "erat", "imperdiet", "sed", "euismod",
      "nisi", "porta", "lorem", "mollis", "aliquam", "ut", "porttitor", "leo", "a",
      "diam", "sollicitudin", "tempor", "id", "eu", "nisl", "nunc", "mi", "ipsum,",
      "faucibus", "vitae", "aliquet", "nec,", "ullamcorper", "sit", "amet", "risus",
      "nullam", "eget", "felis", "eget", "nunc", "lobortis", "mattis", "aliquam",
      "faucibus", "purus", "in", "massa", "tempor", "nec", "feugiat", "nisl",
      "pretium", "fusce", "id", "velit", "ut", "tortor", "pretium", "viverra",
      "suspendisse", "potenti", "nullam", "ac", "tortor", "vitae", "purus",
      "faucibus", "ornare", "suspendisse", "sed", "nisi", "lacus,", "sed", "viverra",
      "tellus", "in", "hac", "habitasse", "platea", "dictumst", "vestibulum",
      "rhoncus", "est", "pellentesque", "elit", "ullamcorper", "dignissim", "cras",
      "tincidunt", "lobortis", "feugiat", "vivamus", "at", "augue", "eget", "arcu",
      "dictum", "varius", "duis", "at", "consectetur", "lorem", "donec", "massa",
      "sapien,", "faucibus", "et", "molestie", "ac,", "feugiat", "sed", "lectus",
      "vestibulum", "mattis", "ullamcorper", "velit", "sed", "ullamcorper", "morbi",
      "tincidunt", "ornare", "massa,", "eget", "egestas", "purus", "viverra",
      "accumsan", "in", "nisl", "nisi,", "scelerisque", "eu", "ultrices", "vitae,",
      "auctor", "eu", "augue", "ut", "lectus", "arcu,", "bibendum", "at", "varius",
      "vel,", "pharetra", "vel", "turpis", "nunc", "eget", "lorem", "dolor,", "sed",
      "viverra", "ipsum", "nunc", "aliquet", "bibendum", "enim,", "facilisis",
      "gravida", "neque", "convallis", "a", "cras", "semper", "auctor", "neque,",
      "vitae", "tempus", "quam", "pellentesque", "nec", "nam", "aliquam", "sem",
      "et", "tortor", "consequat", "id", "porta", "nibh", "venenatis", "cras", "sed",
      "felis", "eget", "velit", "aliquet", "sagittis", "id", "consectetur", "purus",
      "ut", "faucibus", "pulvinar", "elementum", "integer", "enim", "neque,",
      "volutpat", "ac", "tincidunt", "vitae,", "semper", "quis", "lectus", "nulla",
      "at", "volutpat", "diam", "ut", "venenatis", "tellus", "in", "metus",
      "vulputate", "eu", "scelerisque", "felis", "imperdiet", "proin", "fermentum",
      "leo", "vel", "orci", "porta", "non", "pulvinar", "neque", "laoreet",
      "suspendisse", "interdum", "consectetur", "libero,", "id", "faucibus", "nisl",
      "tincidunt", "eget", "nullam", "non", "nisi", "est,", "sit", "amet",
      "facilisis", "magna", "etiam", "tempor,", "orci", "eu", "lobortis",
      "elementum,", "nibh", "tellus", "molestie", "nunc,", "non", "blandit", "massa",
      "enim", "nec", "dui", "nunc", "mattis", "enim", "ut", "tellus", "elementum",
      "sagittis", "vitae", "et", "leo", "duis", "ut", "diam", "quam", "nulla",
      "porttitor", "massa", "id", "neque", "aliquam", "vestibulum", "morbi",
      "blandit", "cursus", "risus,", "at", "ultrices", "mi", "tempus", "imperdiet",
      "nulla", "malesuada", "pellentesque", "elit", "eget", "gravida", "cum",
      "sociis", "natoque", "penatibus", "et", "magnis", "dis", "parturient",
      "montes,", "nascetur", "ridiculus", "mus", "mauris", "vitae", "ultricies",
      "leo", "integer", "malesuada", "nunc", "vel", "risus", "commodo", "viverra",
      "maecenas", "accumsan,", "lacus", "vel", "facilisis", "volutpat,", "est",
      "velit", "egestas", "dui,", "id", "ornare", "arcu", "odio", "ut", "sem",
      "nulla", "pharetra", "diam", "sit", "amet", "nisl", "suscipit", "adipiscing",
      "bibendum", "est", "ultricies", "integer", "quis", "auctor", "elit", "sed",
      "vulputate", "mi", "sit", "amet", "mauris", "commodo", "quis", "imperdiet",
      "massa", "tincidunt", "nunc", "pulvinar", "sapien", "et", "ligula",
      "ullamcorper", "malesuada", "proin", "libero", "nunc,", "consequat",
      "interdum", "varius", "sit", "amet,", "mattis", "vulputate", "enim", "nulla",
      "aliquet", "porttitor", "lacus,", "luctus", "accumsan", "tortor", "posuere",
      "ac", "ut", "consequat", "semper", "viverra", "nam", "libero", "justo,",
      "laoreet", "sit", "amet", "cursus", "sit", "amet,", "dictum", "sit", "amet",
      "justo", "donec", "enim", "diam,", "vulputate", "ut", "pharetra", "sit",
      "amet,", "aliquam", "id", "diam", "maecenas", "ultricies", "mi", "eget",
      "mauris", "pharetra", "et", "ultrices", "neque", "ornare", "aenean", "euismod",
      "elementum", "nisi,", "quis", "eleifend", "quam", "adipiscing", "vitae",
      "proin", "sagittis,", "nisl", "rhoncus", "mattis", "rhoncus,", "urna", "neque",
      "viverra", "justo,", "nec", "ultrices", "dui", "sapien", "eget", "mi", "proin",
      "sed", "libero", "enim,", "sed", "faucibus", "turpis", "in", "eu", "mi",
      "bibendum", "neque", "egestas", "congue", "quisque", "egestas", "diam", "in",
      "arcu", "cursus", "euismod", "quis", "viverra", "nibh", "cras", "pulvinar",
      "mattis", "nunc,", "sed", "blandit", "libero", "volutpat", "sed", "cras",
      "ornare", "arcu", "dui", "vivamus", "arcu", "felis,", "bibendum", "ut",
      "tristique", "et,", "egestas", "quis", "ipsum", "suspendisse", "ultrices",
      "fusce", "ut", "placerat", "orci", "nulla", "pellentesque",
      "dignissim", "enim,", "sit", "amet", "venenatis", "urna", "cursus", "eget",
      "nunc", "scelerisque", "viverra", "mauris,", "in", "aliquam", "sem",
      "fringilla", "ut", "morbi", "tincidunt", "augue", "interdum", "velit",
      "euismod", "in", "pellentesque", "massa", "placerat", "duis", "ultricies",
      "lacus", "sed", "turpis", "tincidunt", "id", "aliquet", "risus", "feugiat",
      "in", "ante", "metus,", "dictum", "at", "tempor", "commodo,", "ullamcorper",
      "a", "lacus", "vestibulum", "sed", "arcu", "non", "odio", "euismod", "lacinia",
      "at", "quis", "risus", "sed", "vulputate", "odio", "ut", "enim", "blandit",
      "volutpat", "maecenas", "volutpat", "blandit", "aliquam", "etiam", "erat",
      "velit,", "scelerisque", "in", "dictum", "non,", "consectetur", "a", "erat",
      "nam", "at", "lectus", "urna", "duis", "convallis", "convallis", "tellus,",
      "id", "interdum", "velit", "laoreet", "id", "donec", "ultrices", "tincidunt",
      "arcu,", "non", "sodales", "neque", "sodales", "ut", "etiam", "sit", "amet",
      "nisl", "purus,", "in", "mollis", "nunc", "sed", "id", "semper", "risus", "in",
      "hendrerit", "gravida", "rutrum", "quisque", "non", "tellus", "orci,", "ac",
      "auctor", "augue", "mauris", "augue", "neque,", "gravida", "in", "fermentum",
      "et,", "sollicitudin", "ac", "orci", "phasellus", "egestas", "tellus",
      "rutrum", "tellus", "pellentesque", "eu", "tincidunt", "tortor", "aliquam",
      "nulla", "facilisi", "cras", "fermentum,", "odio", "eu", "feugiat", "pretium,",
      "nibh", "ipsum", "consequat", "nisl,", "vel", "pretium", "lectus", "quam",
      "id", "leo", "in", "vitae", "turpis", "massa", "sed", "elementum", "tempus",
      "egestas", "sed", "sed", "risus", "pretium", "quam", "vulputate", "dignissim",
      "suspendisse", "in", "est", "ante", "in", "nibh", "mauris,", "cursus",
      "mattis", "molestie", "a,", "iaculis", "at", "erat", "pellentesque",
      "adipiscing", "commodo", "elit,", "at", "imperdiet", "dui", "accumsan", "sit",
      "amet", "nulla", "facilisi", "morbi", "tempus", "iaculis", "urna,", "id",
      "volutpat", "lacus", "laoreet", "non", "curabitur", "gravida", "arcu", "ac",
      "tortor", "dignissim", "convallis", "aenean", "et", "tortor", "at", "risus",
      "viverra", "adipiscing", "at", "in", "tellus", "integer", "feugiat",
      "scelerisque", "varius", "morbi", "enim", "nunc,", "faucibus", "a",
      "pellentesque", "sit", "amet,", "porttitor", "eget", "dolor", "morbi", "non",
      "arcu", "risus,", "quis", "varius", "quam", "quisque", "id", "diam", "vel",
      "quam", "elementum", "pulvinar", "etiam", "non", "quam", "lacus",
      "suspendisse", "faucibus", "interdum", "posuere", "lorem", "ipsum", "dolor",
      "sit", "amet,", "consectetur", "adipiscing", "elit", "duis", "tristique",
      "sollicitudin", "nibh", "sit", "amet", "commodo", "nulla", "facilisi",
      "nullam", "vehicula", "ipsum", "a", "arcu", "cursus", "vitae", "congue",
      "mauris", "rhoncus", "aenean", "vel", "elit", "scelerisque", "mauris",
      "pellentesque", "pulvinar", "pellentesque", "habitant", "morbi", "tristique",
      "senectus", "et", "netus", "et", "malesuada", "fames", "ac", "turpis",
      "egestas", "maecenas", "pharetra", "convallis", "posuere", "morbi", "leo",
      "urna,", "molestie", "at", "elementum", "eu,", "facilisis", "sed", "odio",
      "morbi", "quis", "commodo", "odio", "aenean", "sed", "adipiscing", "diam",
      "donec", "adipiscing", "tristique", "risus", "nec", "feugiat", "in",
      "fermentum", "posuere", "urna", "nec", "tincidunt", "praesent", "semper",
      "feugiat", "nibh", "sed", "pulvinar", "proin", "gravida", "hendrerit",
      "lectus", "a", "molestie", "gravida", "dictum"
    ];

    function randomInt ( min, max ) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    return {
      createSentence: function ( sentenceLength ) {
        var wordIndex,
            sentence,
            sentenceLength;

        // Determine how long the sentence should be. Do it randomly if one was not
        // provided.
        sentenceLength = sentenceLength || randomInt( 5, 20 );


        // Now we determine were we are going to start in the array randomly. We
        // are just going to take a slice of the array, so we have to ensure
        // whereever we start has enough places left in the array to accommodate
        // the random sentence length from above.
        wordIndex = randomInt(0, words.length - sentenceLength - 1);

        // And pull out the words, join them together, separating words by spaces
        // (duh), and removing any commas that may appear at the end of the
        // sentence. Finally, add a period.
        sentence = words.slice(wordIndex, wordIndex + sentenceLength)
              .join(' ')
              .replace(/\,$/g, '') + '.';
              console.log(typeof(sentenceLength));
        // Capitalize the first letter - it is a sentence, after all.
        sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);

        return sentence;
      },
      createSentences: function ( numSentences ) {
        var sentences = [],
            i = 0;

        // Determine how many sentences we should do. Do it randomly if one was not
        // provided.
        numSentences = numSentences || randomInt( 3, 5 );

        // For each paragraph, we should generate between 3 and 5 sentences.
        for ( i = 0; i < numSentences; i++ ) {
          sentences.push( this.createSentence() );
        }

        // And then we just return the array of sentences, concatenated with spaces.
        return sentences.join( ' ' );
      },
      createParagraph: function ( numSentences ) {
        var sentences = this.createSentences( numSentences );

        // Make the sentences into a paragraph and return.
        return "<p>" + sentences + "</p>";
      },
      createParagraphs: function ( numParagraphs, numSentences ) {
        var paragraphs = [],
            i = 0;

        numParagraphs = numParagraphs || randomInt( 3, 7 );

        // Create the number of paragraphs requested.
        for ( i = 0; i < numParagraphs; i++ ) {
          paragraphs.push( this.createParagraph( numSentences ) );
        }

        // Return the paragraphs, concatenated with newlines.
        return paragraphs.join( '\n' );
      }
    };
  })

  .directive( 'phTxt', [ 'TextGeneratorService', function ( TextGeneratorService ) {
    return {
      restrict: "EA",
      controller: [ '$scope', '$element', '$attrs', function ( $scope, $element, $attrs ) {
        var numSentences,
            numParagraphs,
            numWords;
        numSentences = $attrs.sentences;
        numParagraphs = $attrs.paragraphs;
        numWords = parseInt($attrs.words);
        // Gets the number of paragraphs or sentences from the service and
        // populates the DOM node.
        function populate() {
          var contents;

          // If numWords return single sentence. If p or neither, then get paragraphs. Else, get sentences.
          if (numWords) {
            contents = TextGeneratorService.createSentence( numWords );
          } else if( numParagraphs || !numSentences ) {
            contents = TextGeneratorService.createParagraphs( numParagraphs, numSentences );
          } else {
            contents = TextGeneratorService.createSentences( numSentences );
          }

          $element.html( contents );
        }

       populate();
      }]
    };
  }])
  .directive('tabs', function() {
   return {
     restrict: 'E',
     transclude: true,
     scope: {},
     controller: function($scope, $element) {
       var panes = $scope.panes = [];

       $scope.select = function(pane) {
         angular.forEach(panes, function(pane) {
           pane.selected = false;
         });
         pane.selected = true;
       }

       this.addPane = function(pane) {
         if (panes.length == 0) $scope.select(pane);
         panes.push(pane);
       }
     },
     template:
       '<div class="tabbable">' +
         '<ul class="nav nav-tabs">' +
           '<li ng-repeat="pane in panes" ng-class="{active:pane.selected}">'+
             '<a href="" ng-click="select(pane)">{{pane.title}}</a>' +
           '</li>' +
         '</ul>' +
         '<div class="tab-content" ng-transclude></div>' +
       '</div>',
     replace: true
   };
 }).
 directive('pane', function() {
   return {
     require: '^tabs',
     restrict: 'E',
     transclude: true,
     scope: { title: '@' },
     link: function(scope, element, attrs, tabsCtrl) {
       tabsCtrl.addPane(scope);
     },
     template:
       '<div class="tab-pane" ng-class="{active: selected}" ng-transclude>' +
       '</div>',
     replace: true
   };
 });

