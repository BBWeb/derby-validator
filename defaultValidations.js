module.exports = {
  required: {
    rule: required,
    message: 'Required field'
  },
  email: {
    rule: /\S+@\S+\.\S+/,
    message: 'Wrong email format.'
  },
  "default": {
    message: 'Something is wrong with this field.'
  }
};

function required(value) {
  return (value !== null && value !== '');
}
