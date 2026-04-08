export type Lang = "en" | "de" | "fr" | "es";

export interface LangOption {
  code: Lang;
  flag: string;
  label: string;
}

export const languages: LangOption[] = [
  { code: "en", flag: "\ud83c\uddec\ud83c\udde7", label: "English" },
  { code: "de", flag: "\ud83c\udde9\ud83c\uddea", label: "Deutsch" },
  { code: "fr", flag: "\ud83c\uddeb\ud83c\uddf7", label: "Fran\u00e7ais" },
  { code: "es", flag: "\ud83c\uddea\ud83c\uddf8", label: "Espa\u00f1ol" },
];

export const translations = {
  en: {
    title: "Create your account",
    fullName: "Full name (optional)",
    email: "Email",
    password: "Password",
    confirmPassword: "Confirm password",
    createAccount: "Create account",
    signInInstead: "Sign in instead",
    errorRequired: "Please fill in all required fields.",
    errorPasswordLength: "Password must be at least 8 characters.",
    errorPasswordMatch: "Passwords don't match.",
    errorGeneric: "Registration failed. Please try again.",
  },
  de: {
    title: "Konto erstellen",
    fullName: "Vollst\u00e4ndiger Name (optional)",
    email: "E-Mail",
    password: "Passwort",
    confirmPassword: "Passwort best\u00e4tigen",
    createAccount: "Konto erstellen",
    signInInstead: "Stattdessen anmelden",
    errorRequired: "Bitte f\u00fcllen Sie alle Pflichtfelder aus.",
    errorPasswordLength: "Das Passwort muss mindestens 8 Zeichen lang sein.",
    errorPasswordMatch: "Passw\u00f6rter stimmen nicht \u00fcberein.",
    errorGeneric: "Registrierung fehlgeschlagen. Bitte versuchen Sie es erneut.",
  },
  fr: {
    title: "Cr\u00e9er votre compte",
    fullName: "Nom complet (facultatif)",
    email: "E-mail",
    password: "Mot de passe",
    confirmPassword: "Confirmer le mot de passe",
    createAccount: "Cr\u00e9er un compte",
    signInInstead: "Se connecter",
    errorRequired: "Veuillez remplir tous les champs obligatoires.",
    errorPasswordLength: "Le mot de passe doit comporter au moins 8 caract\u00e8res.",
    errorPasswordMatch: "Les mots de passe ne correspondent pas.",
    errorGeneric: "L'inscription a \u00e9chou\u00e9. Veuillez r\u00e9essayer.",
  },
  es: {
    title: "Crea tu cuenta",
    fullName: "Nombre completo (opcional)",
    email: "Correo electr\u00f3nico",
    password: "Contrase\u00f1a",
    confirmPassword: "Confirmar contrase\u00f1a",
    createAccount: "Crear cuenta",
    signInInstead: "Iniciar sesi\u00f3n",
    errorRequired: "Por favor complete todos los campos obligatorios.",
    errorPasswordLength: "La contrase\u00f1a debe tener al menos 8 caracteres.",
    errorPasswordMatch: "Las contrase\u00f1as no coinciden.",
    errorGeneric: "Error en el registro. Por favor, int\u00e9ntelo de nuevo.",
  },
};
