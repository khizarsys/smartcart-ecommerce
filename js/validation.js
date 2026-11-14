/**
 * Small, dependency-free form validation helpers.
 * Each rule returns an error message, or an empty string when the value is valid.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_PATTERN = /^\+?[0-9\s\-()]{7,20}$/;
const POSTAL_PATTERN = /^[A-Za-z0-9\s-]{3,10}$/;

export const rules = {
  required: (label) => (value) => (String(value).trim() ? '' : `${label} is required.`),
  minLength: (label, min) => (value) =>
    String(value).trim().length >= min ? '' : `${label} must be at least ${min} characters.`,
  email: (value) => (EMAIL_PATTERN.test(String(value).trim()) ? '' : 'Enter a valid email address.'),
  phone: (value) => (PHONE_PATTERN.test(String(value).trim()) ? '' : 'Enter a valid phone number (digits, spaces, + and - only).'),
  postalCode: (value) => (POSTAL_PATTERN.test(String(value).trim()) ? '' : 'Enter a valid postal code.'),
  checked: (message) => (value) => (value ? '' : message),
  number: (label, { min = -Infinity, max = Infinity, integer = false } = {}) => (value) => {
    const num = Number(value);
    if (String(value).trim() === '' || Number.isNaN(num)) return `${label} must be a number.`;
    if (integer && !Number.isInteger(num)) return `${label} must be a whole number.`;
    if (num < min) return `${label} must be at least ${min}.`;
    if (num > max) return `${label} must be at most ${max}.`;
    return '';
  },
};

/** Runs every rule for a field and returns the first error found. */
export function validateValue(value, fieldRules) {
  for (const rule of fieldRules) {
    const error = rule(value);
    if (error) return error;
  }
  return '';
}

function readValue(element) {
  return element.type === 'checkbox' ? element.checked : element.value;
}

/** Shows or clears the error message for a single field. */
export function setFieldError(form, name, message) {
  const element = form.elements[name];
  const errorEl = form.querySelector(`#${name}-error`);
  element?.closest('.field')?.classList.toggle('has-error', Boolean(message));
  element?.setAttribute('aria-invalid', String(Boolean(message)));
  if (errorEl) {
    errorEl.textContent = message;
    element?.setAttribute('aria-describedby', errorEl.id);
  }
}

/**
 * Attaches live validation to a form.
 * @param {HTMLFormElement} form
 * @param {Record<string, Function[]>} schema field name -> rules
 * @returns {{ validateAll: () => boolean, values: () => object }}
 */
export function createValidator(form, schema) {
  const touched = new Set();

  const validateField = (name) => {
    const error = validateValue(readValue(form.elements[name]), schema[name]);
    setFieldError(form, name, error);
    return !error;
  };

  for (const name of Object.keys(schema)) {
    const element = form.elements[name];
    element.addEventListener('blur', () => {
      touched.add(name);
      validateField(name);
    });
    // Re-validate as the user types once a field has been visited.
    element.addEventListener(element.type === 'checkbox' || element.tagName === 'SELECT' ? 'change' : 'input', () => {
      if (touched.has(name)) validateField(name);
    });
  }

  return {
    validateAll() {
      let firstInvalid = null;
      for (const name of Object.keys(schema)) {
        touched.add(name);
        if (!validateField(name) && !firstInvalid) firstInvalid = form.elements[name];
      }
      firstInvalid?.focus();
      return !firstInvalid;
    },
    values() {
      return Object.fromEntries(new FormData(form).entries());
    },
  };
}
