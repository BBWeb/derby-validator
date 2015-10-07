# derby-validator
A simple lib to easily add validation to input fields in Derby.

## Features
- Map model document to local fields to easily reset or commit changes.
- Add validation rules for fields to pass.
- Adds variables to check validity and error-messages

## Usage example

#### Including
var Validator = require('derby-validator');

#### Initiate
```javascript
Controller.prototype.init = function(model) {  
  this.validator = new Validator(scoped, origin, fields, options);  
}
```

where:

- **scoped**: Model  
  A scoped model to the location on where to put the validator's data.

- **[origin]**: Model|string  
  Either a scoped model to the location where the original data is stored. Or, a path (as string) to the location where to find the original data. If not passed, the fields parameter is mandatory.

- **[fields]**: Collection.<string, Object>  
  A collection of fields to use. If not passed, the origin parameter is mandatory. The key for each object is the field name, and the value is the field object (specified below).

  - **[default]**: *  
    A default value for this specific field.

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


#### Template
`<input name="email" value="{{validator.email.value}}" on-keyup="validator.email.validate()"/>  
{{if validator.email.isInvalid}}  
    <span>{{validator.email.messages.0}}</span>  
{{/if}}`
