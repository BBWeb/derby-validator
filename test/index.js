var _ = require('lodash');
var expect = require('expect.js');
var Model = require('racer/lib/Model');
var Validator = require('./../lib');

beforeEach(function setupModel() {
  this.model = (new Model).at('_page');

  this.model.set('collection', {
    '1': {
      'a': 'a',
      'b': 2,
      'c': {
        'd': 'd'
      },
      'id': '1'
    },
    '2': {
      'a': 'a',
      'b': 2,
      'c': {
        'd': {
          'f': 'f'
        }
      },
      'id': '2'
    }
  });
});

describe('Setup', function () {
  describe('arguments', function () {
    it('throws on no arguments', function () {
      expect(function () {
        new Validator();
      }).to.throwError();
    });

    it('throws on one argument', function () {
      expect(function () {
        var $validator = this.model.at('validator');

        new Validator($validator);
      }.bind(this)).to.throwError();
    });

    it('passing in origin is treated as origin', function () {
      var $validator = this.model.at('validator');
      var $item = this.model.scope('items.1');

      var validator = new Validator($validator, $item);

      expect(validator.fields).to.be(undefined);
      expect(validator.origin).to.not.be(undefined);
    });

    it('fields object with path field is not treated as origin', function () {
      var $validator = this.model.at('validator');

      var validator = new Validator($validator, {path: {}});

      expect(validator.origin).to.be(undefined);
      expect(validator.fields).to.not.be(undefined);
    });

    it('default object (with fields) parameter is not treated as origin', function () {
      var $validator = this.model.at('validator');
      var defaultObject = {path: 'default.path'};
      var fields = {
        path: {
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };

      var validator = new Validator($validator, defaultObject, fields);

      expect(validator.origin).to.be(undefined);
      expect(validator.fields).to.not.be(undefined);
    });
  });

  describe('default data', function () {
    it('is automatically set when passed in through fields', function () {
      var $validator = this.model.at('validator');
      var fields = {
        path: {
          'default': 'abc',
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = 'abc';

      new Validator($validator, fields);
      var actual = $validator.get('path.value');

      expect(actual).to.eql(expected);
    });

    it('is automatically set when passed in as defaultObject', function () {
      var $validator = this.model.at('validator');
      var defaultObject = {path: 'default.path'};
      var fields = {
        path: {
          'default': 'abc',
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = 'default.path';

      new Validator($validator, defaultObject, fields);
      var actual = $validator.get('path.value');

      expect(actual).to.eql(expected);
    });
  });
});

describe('Validation', function () {
  describe('Fields', function () {
    it('Required empty field does not validate', function (done) {
      var $validator = this.model.at('validator');
      var fields = {
        path: {
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = false;

      var validator = new Validator($validator, fields);

      validator.validateAll(function (actual) {
        expect(actual).to.eql(expected);
        done();
      });
    });

    it('Required field with content does validate', function (done) {
      var $validator = this.model.at('validator');
      var fields = {
        path: {
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = true;

      var validator = new Validator($validator, fields);
      $validator.set('path.value', 'something');

      validator.validateAll(function (actual) {
        expect(actual).to.eql(expected);
        done();
      });
    });
  });

  describe('Origin', function () {
    it('Origin copies it\'s data on setup', function () {
      var $validator = this.model.at('validator');
      var $origin = this.model.at('collection.1');
      var fields = {
        'c.d': {
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = 'a';

      new Validator($validator, $origin, fields);
      var actual = $validator.get('a.value');

      expect(actual).to.eql(expected);
    });
  });

  describe('Paths', function () {
    describe('Two levels', function () {
      it('Origin copies it\'s data on setup', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.1');
        var fields = {
          'c.d': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = 'd';

        new Validator($validator, $origin, fields);
        var actual = $validator.get('c.d.value');

        expect(actual).to.eql(expected);
      });

      it('Does not validate when required but non-existing', function (done) {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.1');
        var fields = {
          'c.e': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = false;

        var validator = new Validator($validator, $origin, fields);
        validator.validateAll(function (actual) {
          expect(actual).to.eql(expected);
          done();
        });
      });

      it('Does validate when required existing', function (done) {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.1');
        var fields = {
          'c.d': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = true;

        var validator = new Validator($validator, $origin, fields);
        validator.validateAll(function (actual) {
          expect(actual).to.eql(expected);
          done();
        });
      });

      it('Does not validate when required but set empty', function (done) {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.1');
        var fields = {
          'c.d': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = false;

        var validator = new Validator($validator, $origin, fields);
        $validator.del('c.d.value');
        validator.validateAll(function (actual) {
          expect(actual).to.eql(expected);
          done();
        });
      });

      it('Does validate when required and set', function (done) {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.1');
        var fields = {
          'c.e': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = true;

        var validator = new Validator($validator, $origin, fields);
        $validator.set('c.e.value', 'abc');
        validator.validateAll(function (actual) {
          expect(actual).to.eql(expected);
          done();
        });
      });

      it('Does get all values', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.1');
        var fields = {
          'c.d': {},
          'c.e': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = _.defaultsDeep({c: {e: 'abc'}}, $origin.get());

        var validator = new Validator($validator, $origin, fields);
        $validator.set('c.e.value', 'abc');
        var actual = validator.getValues();

        expect(actual).to.eql(expected);
      });

      it('Does commit values when valid', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.1');
        var fields = {
          'c.d': {},
          'c.e': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = _.cloneDeep(_.defaultsDeep({c: {e: 'abc'}}, $origin.get()));

        var validator = new Validator($validator, $origin, fields);
        $validator.set('c.e.value', 'abc');
        validator.commit();
        var actual = $origin.get();

        expect(actual).to.eql(expected);
      });

      it('Does not commit values when not valid', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.1');
        var fields = {
          'c.d': {},
          'c.e': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = _.cloneDeep($origin.get());

        var validator = new Validator($validator, $origin, fields);
        validator.commit();
        var actual = $origin.get();

        expect(actual).to.eql(expected);
      });

      it('Does not commit id', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.1');
        var fields = {
          'c.d': {},
          'c.e': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = _.cloneDeep(_.defaultsDeep({c: {e: 'abc'}}, $origin.get()));

        var validator = new Validator($validator, $origin, fields);
        $validator.set('c.e.value', 'abc');
        $validator.set('id.value', '2');
        validator.commit();
        var actual = $origin.get();

        expect(actual).to.eql(expected);
      });
    });

    describe('Three levels', function () {
      it('Origin copies it\'s data on setup', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.d.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = 'f';

        new Validator($validator, $origin, fields);
        var actual = $validator.get('c.d.f.value');

        expect(actual).to.eql(expected);
      });

      it('Does not validate when required but non-existing', function (done) {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.e.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = false;

        var validator = new Validator($validator, $origin, fields);
        validator.validateAll(function (actual) {
          expect(actual).to.eql(expected);
          done();
        });
      });

      it('Does validate when required existing', function (done) {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.d.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = true;

        var validator = new Validator($validator, $origin, fields);
        validator.validateAll(function (actual) {
          expect(actual).to.eql(expected);
          done();
        });
      });

      it('Does not validate when required but set empty', function (done) {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.d.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = false;

        var validator = new Validator($validator, $origin, fields);
        $validator.del('c.d.f.value');
        validator.validateAll(function (actual) {
          expect(actual).to.eql(expected);
          done();
        });
      });

      it('Does validate when required and set', function (done) {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.e.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = true;

        var validator = new Validator($validator, $origin, fields);
        $validator.set('c.e.f.value', 'abc');
        validator.validateAll(function (actual) {
          expect(actual).to.eql(expected);
          done();
        });
      });

      it('Does get all values', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.d.f': {},
          'c.e.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = _.defaultsDeep({c: {e: {f: 'abc'}}}, $origin.get());

        var validator = new Validator($validator, $origin, fields);
        $validator.set('c.e.f.value', 'abc');
        var actual = validator.getValues();

        expect(actual).to.eql(expected);
      });

      it('Does commit values when valid', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.d.f': {},
          'c.e.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = _.cloneDeep(_.defaultsDeep({c: {e: {f: 'abc'}}}, $origin.get()));

        var validator = new Validator($validator, $origin, fields);
        $validator.set('c.e.f.value', 'abc');
        validator.commit();
        var actual = $origin.get();

        expect(actual).to.eql(expected);
      });

      it('Does not commit values when not valid', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.d.f': {},
          'c.e.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = _.cloneDeep($origin.get());

        var validator = new Validator($validator, $origin, fields);
        validator.commit();
        var actual = $origin.get();

        expect(actual).to.eql(expected);
      });

      it('Does not commit id', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.d.f': {},
          'c.e.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = _.cloneDeep(_.defaultsDeep({c: {e: {f: 'abc'}}}, $origin.get()));

        var validator = new Validator($validator, $origin, fields);
        $validator.set('c.e.f.value', 'abc');
        $validator.set('id.value', '3');
        validator.commit();
        var actual = $origin.get();

        expect(actual).to.eql(expected);
      });

      it('Does set changed property on subpath value changes', function () {
        var $validator = this.model.at('validator');
        var $origin = this.model.at('collection.2');
        var fields = {
          'c.d.f': {},
          'c.e.f': {
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expected = true;

        new Validator($validator, $origin, fields);
        $validator.set('c.e.f.value', 'abc');
        var actual = $validator.get('hasChangedFields');

        expect(actual).to.eql(expected);
      });
    });      
  });

  describe('Has validated', function () {
    it('Show correct isValid status from scratch', function () {
      var $validator = this.model.at('validator');
      var fields = {
        'a': {
          group: 'A',
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = false;

      new Validator($validator, fields);
      var actual = $validator.get('a.isValid');

      expect(actual).to.eql(expected);
    });

    it('Show correct isValid status from scratch with default', function () {
      var $validator = this.model.at('validator');
      var fields = {
        'a': {
          group: 'A',
          default: 'abc',
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = false;

      new Validator($validator, fields);
      var actual = $validator.get('a.isValid');

      expect(actual).to.eql(expected);
    });

    it('Show correct isValid status from scratch with origin', function () {
      var $validator = this.model.at('validator');
      var $origin = this.model.at('collection.1');
      var fields = {
        'a': {
          group: 'A',
          default: 'abc',
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = false;

      new Validator($validator, $origin, fields);
      var actual = $validator.get('a.isValid');

      expect(actual).to.eql(expected);
    });

    it('Show correct isValid status when checked', function () {
      var $validator = this.model.at('validator');
      var fields = {
        'a': {
          group: 'A',
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = false;

      var validator = new Validator($validator, fields);
      validator.validateAll();

      var actual = $validator.get('a.isValid');

      expect(actual).to.eql(expected);
    });

    it('Show correct isValid status when checked with default', function () {
      var $validator = this.model.at('validator');
      var fields = {
        'a': {
          group: 'A',
          default: 'abc',
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = true;

      var validator = new Validator($validator, fields);
      validator.validateAll();

      var actual = $validator.get('a.isValid');

      expect(actual).to.eql(expected);
    });

    it('Show correct isValid status when checked with origin', function () {
      var $validator = this.model.at('validator');
      var $origin = this.model.at('collection.1');
      var fields = {
        'a': {
          group: 'A',
          default: 'abc',
          validations: [
            {
              rule: 'required'
            }
          ]
        }
      };
      var expected = true;

      var validator = new Validator($validator, $origin, fields);
      validator.validateAll();

      var actual = $validator.get('a.isValid');

      expect(actual).to.eql(expected);
    });

    describe.only('Groups', function () {
      it('Show correct isValid status from scratch', function () {
        var $validator = this.model.at('validator');
        var fields = {
          'a': {
            group: 'A',
            validations: [
              {
                rule: 'required'
              }
            ]
          },
          'b': {
            group: 'A',
            validations: [
              {
                rule: 'required'
              }
            ]
          },
          'c': {
            group: 'B',
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expectedA = false;
        var expectedB = false;

        new Validator($validator, fields);
        var actualA = $validator.get('groups.A.isValid');
        var actualB = $validator.get('groups.B.isValid');

        expect(actualA).to.eql(expectedA);
        expect(actualB).to.eql(expectedB);
      });

      it('Show correct isValid status when checked', function () {
        var $validator = this.model.at('validator');
        var fields = {
          'a': {
            group: 'A',
            validations: [
              {
                rule: 'required'
              }
            ]
          },
          'b': {
            group: 'A',
            validations: [
              {
                rule: 'required'
              }
            ]
          },
          'c': {
            group: 'B',
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expectedA = false;
        var expectedB = false;

        var validator = new Validator($validator, fields);
        validator.validateAll();

        var actualA = $validator.get('groups.A.isValid');
        var actualB = $validator.get('groups.B.isValid');

        expect(actualA).to.eql(expectedA);
        expect(actualB).to.eql(expectedB);
      });

      it('Show correct isValid status when checked and data has been set on one of two groups', function () {
        var $validator = this.model.at('validator');
        var fields = {
          'a': {
            group: 'A',
            validations: [
              {
                rule: 'required'
              }
            ]
          },
          'b': {
            group: 'A',
            validations: [
              {
                rule: 'required'
              }
            ]
          },
          'c': {
            group: 'B',
            validations: [
              {
                rule: 'required'
              }
            ]
          }
        };
        var expectedA = true;
        var expectedB = false;

        var validator = new Validator($validator, fields);
        $validator.set('a.value', 'abc');
        validator.validateAll();

        var actualA = $validator.get('groups.A.isValid');
        var actualB = $validator.get('groups.B.isValid');

        expect(actualA).to.eql(expectedA);
        expect(actualB).to.eql(expectedB);
      });
    });
  });
});
