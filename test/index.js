var expect = require('expect.js');
var _ = require('lodash');
var Model = require('racer/lib/Model');
var Validator = require('./../lib');

beforeEach(function setupModel() {
  this.model = (new Model).at('_page');
});

describe('Setup', function () {
  it('throws on no arguments', function () {
    expect(function () {
      var validator = new Validator();
    }).to.throwError();
  });

  it('throws on one argument', function () {
    expect(function () {
      var $validator = this.model.at('validator');

      var validator = new Validator($validator);
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
});
