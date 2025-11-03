// Common passwords list (top 100 most common - in production, expand this)
const COMMON_PASSWORDS = [
  "password", "123456", "123456789", "12345678", "12345", "1234567", "password1",
  "123123", "1234567890", "000000", "abc123", "qwerty", "iloveyou", "welcome",
  "monkey", "dragon", "master", "sunshine", "princess", "qwerty123", "password123",
  "111111", "123321", "666666", "654321", "superman", "1qaz2wsx", "trustno1",
  "pass123", "letmein", "whatever", "football", "baseball", "admin", "shadow"
];

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  strength: "weak" | "fair" | "good" | "strong";
}

export interface PasswordRequirement {
  met: boolean;
  label: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  let strength: "weak" | "fair" | "good" | "strong" = "weak";

  // Minimum length check
  if (password.length < 12) {
    errors.push("Password must be at least 12 characters long");
  }

  // Uppercase letter check
  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  // Lowercase letter check
  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  // Number check
  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character (!@#$%^&*)");
  }

  // Common password check
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push("This password is too common. Please choose a more unique password");
  }

  // Calculate strength based on criteria met
  const criteriaMet = 5 - errors.length;
  if (criteriaMet >= 5) strength = "strong";
  else if (criteriaMet >= 4) strength = "good";
  else if (criteriaMet >= 3) strength = "fair";
  else strength = "weak";

  return {
    isValid: errors.length === 0,
    errors,
    strength,
  };
}

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    {
      met: password.length >= 12,
      label: "At least 12 characters",
    },
    {
      met: /[A-Z]/.test(password),
      label: "Contains uppercase letter",
    },
    {
      met: /[a-z]/.test(password),
      label: "Contains lowercase letter",
    },
    {
      met: /\d/.test(password),
      label: "Contains number",
    },
    {
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      label: "Contains special character",
    },
    {
      met: !COMMON_PASSWORDS.includes(password.toLowerCase()),
      label: "Not a common password",
    },
  ];
}
