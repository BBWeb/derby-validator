# derby-validator
A simple lib to easily add validation to input fields in Derby.

Features
--------
- Map model document to local fields to easily reset or commit changes.
- Add validation rules for fields to pass.
- Add properties to check validity and error-messages

Usage
-----

### Including
```javascript
var Validator = require('derby-validator');
```

### Initiate
```javascript
Controller.prototype.init = function(model) {  
  this.validator = new Validator(scoped, origin, fields, options);  
}
```
*where*:  

-  **scoped**: Model  
  A scoped model to the location on where to put the validator's data.

- **[origin]**: Model|string  
  Either a scoped model to the location where the original data is stored. Or, a path (as string) to the location where to find the original data. If not passed, the fields parameter is mandatory.

- **[fields]**: Collection.<string, Object>  
  A collection of fields to use. If not passed, the origin parameter is mandatory. The key for each object is the field name, and the value is the field object (specified below).

  - **[default]**: *  
    A default value for this specific field.

  - **[group]**: *  
    A group the field belongs to. Useful for looking up validity of multiple fields simultaneously.

  - **[validations]**: Object[]  
    A list of validations to apply.

    - **rule**: String|Function|Regex'  
      The rule to use when validating this rule. Either, this can be a string matching the name of a default rule (specified in default checks or passed in as an option), OR a function which will get run with the value to be validated as input, which should return true|false reflecting the validity, OR a RegEx, which will get run similar to if you pass in a function.

    - **[message]**: String  
      The error message to show if validation fails.

- **[options]**: Object  
  An options object.

  - **[rules]**: Collection.<string, Function|RegEx>  
    A collection of default rules to add to this instance. Each key is the name of the rule. The value is the rule, either a function or regular expression similar to field specific functions/regular expressions passed in the fields parameter.

  - **[messages]**: Collection.<string, string>  
    A collection of messages to add to rules of this instance. Each key is the name of the rule. The value is the message to be shown if validation fails.

*example*:  
```javascript
Controller.prototype.init = function(model) {  
  this.validator = new Validator(
    // Scoped model  
    model.at('validator'),
    // Origin model document, may also be a string that is a path to said document.
    // model.scope('users.' + userId),
    // Fields  
    {
      email: {
        // Default value  
        'default': "",
        group: 'A',
        // Validations  
        validations: [
          {
            // Rule as string, links to options or defaultValidations.js  
            rule: "required",
            // Message to show, overwrites options or default message  
            message: "You need to write an email."
          },
          {
            // Rule as RegEx 
            rule: /\S+@\S+\.\S+/,
            message: "Wrong email format."
          },
          {
            // Rule as function, is called with field value and callback as arguments and must callback with the validation result.  
            rule: function(value, cb) {
              cb(value.length > 5);
            },
            message: "Minimum of 5 characters required."
          }
        ]
      },
      password: {
        'default': "",
        group: 'B',
        validations: [
          {
            // If no message is added, the validator will look at options and defaults to find a message, in that order.   
            rule: "required" 
          }
        ]
      },
      name: {
        group: 'A',
        validations: [
          {
            rule: "required"
          }
        ]
      }
    },
    // Options  
    {
      // Rules that can be used by fields  
      rules: {
        // The property name is also the name of the rule, the value can be a function or a RegEx  
        required: function(value, cb) {
          cb(value !== null && value !== '');
        }
      },
      // Messages to add to rules with the same property name. Used before default message but after field specific messages.  
      messages: {
        required: "Required field."
      }
    }
  );
};
```  


#### Template
```html
<input value="{{validator.email.value}}" on-keyup="validator.validate('email')" placeholder="email" /><br />  
{{if validator.email.isInvalid}}  
  <span style="color:red">{{validator.email.messages[0]}}</span><br /> 
{{/if}}
<input value="{{validator.password.value}}" on-keyup="validator.validate('password')" placeholder="password" /><br />  
{{if validator.password.isInvalid}}  
  <span style="color:red">{{validator.password.messages[0]}}</span><br />  
{{/if}}
<button on-click="validator.validateAll()">Validate</button><br />
{{if validator.hasInvalidFields}}
  <span style="color:red">One or more fields are invalid.</span>  
{{/if}}
```

Methods
-------
##### .reset()
Sets all field values to origin values.

##### .commit(force)
Validates all (unless force === true) and commits values to model.

##### .validate(fieldName, cb)
Runs through all validations connected to the field (string fieldName) and sets the field to valid/invalid. Calls cb when all validation passed or as soon as a validation fails. Callback passes validation state as a boolean.
 
Is the same thing as calling: 
validator[fieldName].validate(cb)

##### .validateAll(cb)
Calls validate() on all fields. Callacks when all fields passed validation or as soon as a field failed. Callback passes validation state as a boolean.

##### .setInvalid(fieldName, message)
Used to set a field (string fieldName) as invalid manually.


Properties
---------
*Always available even if fields parameter is not passed to the constructor:*
##### field.value
Use for `<input value={{field.value}}>`. Is set to origin value on resetForm() or committed to origin on commit().

---

*Only available if fields parameter is passed to the constructor:*
##### hasInvalidFields
True if any field has been invalidated. Useful to check before sending form.

##### field.isValid
False if it hasn't been validated. Useful to see if a field passed its validations.

##### field.isInvalid
False if it hasn't been validated. Useful to show messages or in some other way display that the field is invalid. See example in template.  

##### field.messages
An array of string messages if the field didn't pass validation. Order of messages is in the same order that the rules are run, based on the order the rules are declared in the fields object parameter. In the example template above: field.messages.0 is the first rule that failed validation.

---

##### groups.<group name>.isValid
Represents the complete validity of a whole group.

TODO
====

- Add support for validations to be dependant on if another validation passed.
