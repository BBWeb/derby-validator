module.exports = {
  'default': {
    message: 'Something is wrong with this field.'
  },
  email: {
    rule: /\S+@\S+\.\S+/,
    message: 'Wrong email format.'
  },
  required: {
    rule: required,
    message: 'Required field'
  }
};

function required(value) {
  return (value !== null && value !== '' && typeof value !== 'undefined');
}
