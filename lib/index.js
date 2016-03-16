var _ = require('lodash');
var async = require('async');
var defaultValidations = require('./defaultValidations');
var Model = require('racer/lib/Model');

module.exports = Validator;

/**
 * Creates a validator object and initiates it
 * @param {Model} model - A scoped model to the location on where to put the validator's data
 * @param {Model|string|Object} [origin|defaultObject] - Either a scoped model to the location where the original data is stored. Or, a path (as string) to the location where to find the original data. If not passed, the fields parameter is mandatory. Can also be passed in as a defaultObject. If passed in as default objet, the fields parameter is also mandatory.
 * @param {Collection.<string, Object>} [fields] - A collection of fields to use. If not passed, the origin parameter is mandatory. The key for each object is the field name, and the value is the field object (specified below).
   * @param {*} [fields.<fieldName>.default] - A default value for this specific field.
   * @param {String} [fields.<fieldName>.group] - A group the field belongs to. Useful for looking up validity of multiple fields simultaneously.
   * @param {Object[]} [fields.<fieldName>.validations] - A list of validations to apply.
     * @param {String|Function|RegEx} [fields.<fieldName>.validations.<index>.rule] - The rule to use when validating this rule. Either, this can be a string matching the name of a default rule (specified in default checks or passed in as an option), OR a function which will get run with the value to be validated as input and a callback to return the validity with, OR a RegEx to test against.
     * @param {String} [fields.<fieldName>.validations.<index>.message] - The error message to show if validation fails
 * @param {Object} [options] - An options object
   * @param {Collection.<string, Function|RegEx>} [options.rules] - A collection of default rules to add to this instance. Each key is the name of the rule. The value is the rule, either a function or regular expression similar to field specific functions/regular expressions passed in the fields parameter 
 * @returns {Validator} - Instance of Validator
 */
function Validator(model, origin, fields, options) {
  // Parse out arguments
  var self = this;
  var args = Array.prototype.slice.call(arguments);

  if(!args.length) throw new Error('You must specify a model!');
  if(args.length == 1) throw new Error('You must either specify an origin or a fields object');

  this.model = args.shift();
  var arg = args.shift();

  // Origin cases
  if(arg instanceof Model) {
    this.origin = arg;

    arg = args.shift();
  } else if(typeof arg === 'string') {
    this.origin = this.model.scope(arg);

    arg = args.shift();
  }

  // If only a collection was passed, assume we want to add to a new doc
  if(this.origin) {
    var segments = this.origin._splitPath();

    if(segments.length === 1) {
      // Generate a new id
      this.origin = this.origin.at(model.id());
    }
  }

  if(arg) {
    // Case where we've passed in a default object
    if(!Array.isArray(arg) && typeof args[0] !== 'undefined') {
      var defaultObject = arg;

      arg = args.shift();
    }

    // Fields argument
    if(Array.isArray(arg)) {
      // Support passing in an array of fields
      this.fields = _.zipObject(arg, _.fill(Array(arg.length), {}));
    } else {
      this.fields = _.cloneDeep(arg);
    }

    if(defaultObject) {
      _.each(defaultObject, function (val, key) {
        if(!self.fields[key]) self.fields[key] = {};

        self.fields[key]['default'] = val;
      });
    }
  }

  this.options = _.assign({
    rules: {},
    messages: {}
  }, args.shift());

  // Setup
  this._setup();
}

// TODO: Add proper docs for external facing methods, such as this one
Validator.prototype.getValues = function (noId) {
  var values = {};
  var fieldsObject = this._getFieldsObject();
  var exclude = ['hasChangedFields', 'hasInvalidFields', 'groups'];
  if(noId) exclude.push('id');

  function get(collection, fieldsObject, values) {
    _.each(collection, function (field, fieldName) {
      if(!fieldsObject || fieldsObject[fieldName] === true || typeof fieldsObject[fieldName] === 'undefined') {
        if(exclude.indexOf(fieldName) > -1) return;

        values[fieldName] = field.value;
        return;
      }

      values[fieldName] = values[fieldName] || {};

      get(field, fieldsObject[fieldName], values[fieldName]);
    });
  }

  get(this.model.get(), fieldsObject, values);

  return values;
};

Validator.prototype._getFieldsObject = function () {
  var fieldsObject = {};

  function set(fieldsObject, segments) {
    var segment = segments.shift();

    if(segments.length < 1) return fieldsObject[segment] = true;

    fieldsObject[segment] = fieldsObject[segment] || {};
    set(fieldsObject[segment], segments);
  }

  _.each(this.fields, function (field, fieldName) {
    var segments = fieldName.split('.');

    set(fieldsObject, segments);
  });

  return fieldsObject;
};

// TODO: Add proper docs for external facing methods, such as this one
Validator.prototype.validate = function (fieldname, callback) {
  this._validate(fieldname, callback);
};

// TODO: Add proper docs for external facing methods, such as this one
Validator.prototype.validateAll = function(callback) {
  var self = this;

  var validating = [];

  _.each(this.fields, function (field, fieldName) {
    if(!field.validations) return;

    validating.push(function (asyncCallback) {
      self._validate(fieldName, function (valid) {
        asyncCallback(valid ? null : true, valid);
      });
    });
  });

  async.parallel(validating, function (err, res) {
    if (callback) callback(err ? false : true, res);
  });
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
 * Validates and commits to model.
 *
 * @param {Boolean} [force] - Whether to force commit without validating.
 * @param {Function} [callback] - A function that is called after validation. Passes valid state. 
 */
Validator.prototype.commit = function (force, callback) {
  if (!this.origin) return;

  if (arguments.length === 1 && typeof arguments[0] !== 'boolean')  {
    callback = arguments[0];
    force = false;
  }

  if (force) {
    this._commitToModel();

    return;
  }

  var self = this;
  this.validateAll(function (valid) {
    if (valid) self._commitToModel();
    
    if (callback) callback(valid);
  });
};

Validator.prototype._commitToModel = function () {
  var values = this.getValues(true);

  if(this.origin.get('id')) {
    this.origin.setEach(values);
  } else {
    // REVIEW: If we haven fetched/subscribed to a doc which we have the id for (i.e. we try to add a doc which already exists in DB), we get random errors that we don't handle (but doesn't seem to really affect anything)
    var id = this.origin.leaf();
    values.id = id;
    this.origin.parent().add(values);
  }
};

Validator.prototype._setup = function () {
  var self = this;

  if (this.fields) {
    _.each(this.fields, function (field, fieldName) {
      self._addFieldProperties(fieldName, field);
    });
  }

  if(this.origin) this._addFromOrigin();

  this.model.on('change', '**', function (path, value) {
    var segments = path.split('.');
    var contains = _.contains(segments, 'value');
    var last = _.last(segments);
    var field;

    if (contains) {
      var valueIndex = _.findIndex(segments, function (segment) {
        return segment === 'value';
      });
      
      field = _.slice(segments, 0, valueIndex).join('.');

      var  startValue = (self.origin) ? self.origin.get(field) : _.get(self.fields, field + 'default');

      if (!_.isEqual(self.model.get(field + '.value'), startValue)) {
        self.model.set(field + '.hasChanged', true);
      } else {
        self.model.set(field + '.hasChanged', false);
      }

      self._setChangedState(); 
      
    } else {
      field = _.dropRight(segments).join('.');
    }

    if(last === 'isValid' && self.fields && self.fields[field]) {
      self._setGroupValidity(field, value);
    }
  });
};

Validator.prototype._setGroupValidity = function (field, value) {
  var group = this.fields[field].group || 'default';
  var path = 'groups.' + group + '.isValid';
  var currentlyValid = this.model.get(path);

  // No change in status
  if(currentlyValid == value) return;

  // It was true, now it's not valid anymore
  if(!value) this.model.set(path, false);

  // It was false, but might be true now if all others are also true
  var self = this;
  var allValid = _.every(this.fields, function (field, key) {
    var fieldGroup = field.group || 'default';

    if(fieldGroup !== group) return true;

    if(!self.model.get(key + '.isInvalid')) return true;

    return false;
  });

  if(!allValid) return;

  this.model.set(path, true);
};

Validator.prototype._addFromOrigin = function () {
  var self = this;
  var fieldsObject = this._getFieldsObject();

  function add(collection, segments, fieldsObject) {
    _.each(collection, function (value, fieldName) {
      var newSegments = segments.concat([fieldName]);
      var path = newSegments.join('.');

      if(!fieldsObject || fieldsObject[fieldName] === true || typeof fieldsObject[fieldName] === 'undefined') {
        self.model.set(path + '.value', value);
        return;
      }

      add(value, newSegments, fieldsObject[fieldName]);
    });
  }

  add(this.origin.getDeepCopy(), [], fieldsObject);
};

Validator.prototype._addFieldProperties = function (fieldName, field) {
  var self = this;
  var data = {value: null};

  if(field) {
    data = {value: field.default};

    if(field.validations) {
      _.assign(data, {
        validations: this._assignValidations(field.validations),
        isValid: false,
        isInvalid: false,
        validate: function (callback) {
          return self._validate(fieldName, callback);
        }
      });
    }
  }

  this.model.setEach(fieldName, data);
};

Validator.prototype._validate = function (fieldName, callback) {
  this.model.del(fieldName + '.messages');
  this.model.set(fieldName + '.validating', true);
  var serial = this.model.increment(fieldName + '.serial');
  var self = this;

  var field = this.model.get(fieldName);
  if (!field || !field.hasOwnProperty('validations')) {
    if (callback) callback(true);
    return;
  }

  var validating = [];
  for (var i = 0; i < field.validations.length; i++) {
    validating.push(this._check(fieldName, field.value, field.validations[i], serial, this));
  }

  async.parallel(validating, function (err, results) {
    var valid = err ? false : true;

    self._setValidity(fieldName, valid);

    if (callback) callback(valid);
    if (serial === self.model.get(fieldName + '.serial')) self.model.del(fieldName + '.validating');
  });
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

Validator.prototype._check = function (fieldName, value, validation, serial, context) {
  return function (callback) {
    var setValidity = function (valid, invalidResult) {
      var current = (serial === context.model.get(fieldName + '.serial'));
      if (current && !valid) context.model.push(fieldName + '.messages', validation.message);

      if (current && invalidResult) context.model.set(fieldName + '.invalidAt', invalidResult);
      
      callback(current && valid ? null : true, valid);
    };

    if (_.isRegExp(validation.rule)) setValidity(validation.rule.test(value));

    if (typeof validation.rule === 'function') validation.rule(value, setValidity);
  };
};

Validator.prototype._setValidity = function (fieldName, validity) {
  this.model.setEach(fieldName, { isInvalid: !validity, isValid: validity });
  if (validity) this.model.del(fieldName + '.invalidAt');

  this._setState();
};

Validator.prototype._setState = function() {
  this.model.set('hasInvalidFields', !!_.result(_.find(this.model.get(), {'isInvalid': true}), 'isInvalid'));
};

Validator.prototype._setChangedState = function() {
  function find(collection, property) {
    return _.findKey(collection, function (field, fieldName) {
      if (field.hasOwnProperty('value')) {
        return field[property];
      }
      
      if (typeof field === 'object') return find(field, property);

      return false;
    });
  }

  this.model.set('hasChangedFields', !!find(this.model.get(), 'hasChanged'));
};
