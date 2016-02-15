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
      }
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
  });
});
