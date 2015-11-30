var _ = require('lodash');
var defaultValidations = require('./defaultValidations');

module.exports = Validator;

/**
 * Creates a validator object and initiates it
 * @param {Model} model - A scoped model to the location on where to put the validator's data
 * @param {Model|string} [origin] - Either a scoped model to the location where the original data is stored. Or, a path (as string) to the location where to find the original data. If not passed, the fields parameter is mandatory.
 * @param {Collection.<string, Object>} [fields] - A collection of fields to use. If not passed, the origin parameter is mandatory. The key for each object is the field name, and the value is the field object (specified below).
   * @param {*} [fields.<fieldName>.default] - A default value for this specific field.
   * @param {Object[]} [fields.<fieldName>.validations] - A list of validations to apply.
     * @param {String|Function|RegEx} [fields.<fieldName>.validations.<index>.rule] - The rule to use when validating this rule. Either, this can be a string matching the name of a default rule (specified in default checks or passed in as an option), OR a function which will get run with the value to be validated as input, which should return true|false reflecting the validity, OR a RegEx, which will get run similar to if you pass in a function.
     * @param {String} [fields.<fieldName>.validations.<index>.message] - The error message to show if validation fails
 * @param {Object} [options] - An options object
   * @param {Collection.<string, Function|RegEx>} [options.rules] - A collection of default rules to add to this instance. Each key is the name of the rule. The value is the rule, either a function or regular expression similar to field specific functions/regular expressions passed in the fields parameter 
 * @returns {Validator} - Instance of Validator
 */
function Validator(model, origin, fields, options) {
  // Parse out arguments

  var args = Array.prototype.slice.call(arguments);

  if(!args.length) throw new Error('You must specify a model!');
  if(!args.length == 1) throw new Error('You must either specify an origin or a fields object');

  this.model = args.shift();
  var arg = args.shift();

  if(typeof (arg || {}).path === 'function') {
    this.origin = arg;

    arg = args.shift();
  } else if(typeof arg === 'string') {
    this.origin = this.model.scope(arg);

    arg = args.shift();
  }

  if(arg) this.fields = arg;

  this.options = _.assign({
    rules: {},
    messages: {}
  }, args.shift());

  // Setup
  this._setup();
};

// TODO: Add proper docs for external facing methods, such as this one
Validator.prototype.getValues = function () {
  var values = {};
  _.each(this.model.get(), function (field, fieldName) {
    values[fieldName] = field.value;
  });
  return values;
}

// TODO: Add proper docs for external facing methods, such as this one
Validator.prototype.validate = function (fieldname) {
  return this._validate(fieldname);
};

// TODO: Add proper docs for external facing methods, such as this one
Validator.prototype.validateAll = function() {
  var self = this;
  var valid = true;

  _.each(this.model.get(), function (n, key) {
    var fieldIsValid = this._validate(key);

    if(valid) valid = fieldIsValid;
  }, this);

  return valid;
};

// TODO: Add proper docs for external facing methods, such as this one
Validator.prototype.setInvalid = function (fieldName, message) {
  this._setValidity(fieldName, false);
  this.model.push(fieldName + '.messages', message || defaultValidations['default'].message);
};

/*
 * @public
 * Reset values to origin.
 */
Validator.prototype.reset = function () {
  this._setup();
};

/*
 * @public
 * Commit values to model. Call after client- and serverside validation.
 *
 * @param {Boolean} force - Whether to force commit despite validation not passing
 */
Validator.prototype.commit = function (force) {
  if(!this.origin) return;

  if(!force && !this.validateAll()) return;

  _.each(this.origin.get(), function (n, key) {
    if(key !== 'id' && this.model.get(key)) this.origin.set(key, this.model.get(key + '.value'));
  }, this);
};

Validator.prototype._setup = function () {
  var self = this;

  if (this.fields) {
    _.each(this.fields, function (n, key) {
      self._addFieldProperties(key, n);
    });
  };

  if(this.origin) {
    _.each(this.origin.get(), function (value, fieldName) {
      self.model.set(fieldName + '.value', value);
    });
  };
};

Validator.prototype._addFieldProperties = function (fieldName, field) {
  var self = this;

  this.model.setEach(fieldName, {
    value: field.default,
    validations: this._assignValidations(field.validations),
    isValid: false,
    isInvalid: false,
    validate: function () {
      self._validate(fieldName);
    }
  });
};

Validator.prototype._validate = function (fieldName) {
  this.model.del(fieldName + '.messages');

  var field = this.model.get(fieldName);
  if(!field || !field.hasOwnProperty('validations')) return true;

  var valid = true;
  for (var i = 0; i < field.validations.length; i++) {
    var validation = field.validations[i];

    if (!this._check(field, validation.rule)) {
      valid = false; 
      
      this.model.push(fieldName + '.messages', validation.message);
    }
  };

  this._setValidity(fieldName, valid);

  return valid;
};

Validator.prototype._assignValidations = function (validations) {
  for (var i = 0; i < validations.length; i++) {
    var validation = validations[i];

    if (!validation.message) validation.message = this._getMessage(validation.rule);

    if (typeof validation.rule === 'string') validation.rule = this._getRule(validation.rule);

    if (typeof validation.rule !== 'function' && !_.isRegExp(validation.rule)) throw new Error('This rule is not (or does not point to) a RegEx or a function.');
  }

  return validations;
};

Validator.prototype._getRule = function (ruleName) {
  if(this.options.rules[ruleName]) return this.options.rules[ruleName];

  if(defaultValidations.hasOwnProperty(ruleName)) return defaultValidations[ruleName].rule;

  throw new Error('Rule: "' + ruleName + '" is not available. You need to add it as an option.');
};

Validator.prototype._getMessage = function (ruleName) {
  return this.options.messages[ruleName] || ((defaultValidations.hasOwnProperty(ruleName)) ? defaultValidations[ruleName].message : defaultValidations['default'].message);
};

Validator.prototype._check = function (field, rule) {
  if(_.isRegExp(rule)) return rule.test(field.value);

  if(typeof rule === 'function') return rule(field.value);
};

Validator.prototype._setValidity = function (fieldName, validity) {
  this.model.setEach(fieldName, { isValid: validity, isInvalid: !validity });
  this._setState();
};

Validator.prototype._setState = function() {
  this.model.set('hasInvalidFields', !!_.result(_.find(this.model.get(), {'isInvalid': true}), 'isInvalid')); 
};
