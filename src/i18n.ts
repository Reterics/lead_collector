import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Simple in-memory resources. You can later replace with JSON files per locale.
export const resources = {
  en: {
    translation: {
      app: {
        title: 'Lead Collector',
        back: 'Back',
        goHome: 'Go to Home',
        home: 'Home',
        settings: 'Settings',
        notFound: 'Questionnaire not found',
        notFoundDesc: 'The requested questionnaire "{{id}}" does not exist.',
      },
      auth: {
        signInTitle: 'Sign in to your account',
        error: 'Error',
        loading: 'Loading',
        emailLabel: 'Your email',
        passwordLabel: 'Password',
        signIn: 'Sign in',
        logout: 'Logout',
      },
      home: {
        choose: 'Choose a questionnaire',
        new: 'New questionnaire',
        submissions: 'Submissions',
        importJson: 'Import JSON',
        start: 'Start',
        edit: 'Edit',
        export: 'Export',
        delete: 'Delete',
        predefinedWarn: 'Predefined questionnaires cannot be deleted.',
        confirmDelete:
          'Delete "{{name}}"? This cannot be undone for custom questionnaires.',
        imported: 'Imported questionnaire: {{name}}',
        invalidJson: 'Invalid JSON',
        missingFields: 'Missing required fields: name, questions',
        failedImport: 'Failed to import file',
      },
      editor: {
        headingCreate: 'Create Questionnaire',
        headingEdit: 'Edit Questionnaire',
        name: 'Name',
        description: 'Description',
        question: 'Question {{index}}',
        duplicate: 'Duplicate',
        remove: 'Remove',
        label: 'Label',
        type: 'Type',
        types: {
          text: 'Text',
          textarea: 'Textarea',
          checkbox: 'Checkbox',
          radio: 'Radio',
          dropdown: 'Dropdown',
          image: 'Image',
        },
        descriptionOptional: 'Description (optional)',
        options: 'Options',
        addOption: 'Add option',
        removeOption: 'Remove',
        addQuestion: 'Add question',
        save: 'Save',
        failedToSave: 'Failed to save',
      },
      questionnaire: {
        yes: 'Yes',
        select: 'Select...',
        start: 'Start',
        stop: 'Stop',
        send: 'Send',
        sending: 'Sending...',
        send_without_jira: 'Send without JIRA',
        transcribe_gcs: 'Transcribe (GCS)',
        transcribing: 'Transcribing...',
        accept_terms_text: 'I accept the',
        terms_link: 'Terms and Conditions',
        accept_terms_error: 'You must accept the Terms and Conditions to proceed.',
        change_image: 'Change image',
        change: 'Change',
        remove: 'Remove',
        use_camera: 'Use camera',
        upload_from_device: 'Upload from device',
        retake_camera: 'Retake (camera)'
      },
      submissions: {
        title: 'Submissions',
        back: 'Back',
        refresh: 'Refresh',
        retry: 'Retry',
        retrying: 'Retrying...',
        open: 'Open',
        close: 'Close',
        empty: 'No submissions recorded yet.',
        headers: {
          status: 'Status',
          summary: 'Summary',
          questionnaire: 'Questionnaire',
          date: 'Date',
          actions: 'Actions',
        },
        status: {
          jira: 'JIRA created',
          local: 'Stored locally',
          firestore: 'Stored in Cloud',
          auth: 'Auth required',
          error: 'Error',
          unknown: 'Unknown',
        },
        openInJira: 'Open in JIRA',
        details: 'Details',
        delete: 'Delete',
        confirmDelete: 'Delete this submission record?',
        desktopView: 'Desktop view',
        mobileView: 'Mobile view',
      },
      terms: {
        title: 'Terms and Conditions',
        intro: 'These Terms and Conditions govern the use of this application.',
        placeholder: 'Please review these terms carefully. By proceeding you agree to be bound by them.'
      },
      success: {
        title: 'JIRA issue created successfully',
        summary: 'Summary',
        submitted: 'Your request has been submitted.',
        issue: 'Issue'
      },
      camera: {
        close: 'Close',
        capture: 'Capture',
        front: 'Front',
        rear: 'Rear',
        error_unable_access: 'Unable to access camera'
      },
      settings: {
        title: 'Settings',
        tabs: {
          general: 'General',
          user: 'User settings',
          list: 'User list',
          add: 'Add user'
        },
        general: {
          language: {
            title: 'Language',
            desc: 'Choose the app language.'
          },
          theme: {
            title: 'Theme',
            desc: 'Switch between light and dark theme.'
          }
        },
        form: {
          jiraProjectKey: 'JIRA Project Key',
          jiraIssueType: 'JIRA Issue Type',
          jiraCloudId: 'JIRA Cloud ID',
          cloudIdHelp: 'If set, the backend may use this to target a specific Jira site.',
          placeholders: {
            projectKey: 'e.g. ABC',
            issueType: 'Task',
            cloudId: 'Optional, usually discovered via OAuth',
            email: 'user@example.com',
            name: 'Full name (optional)',
            tempPassword: 'Optional',
            confirmPassword: 'Repeat password'
          }
        },
        save: 'Save',
        saving: 'Saving...',
        saved: 'Saved',
        saveFailed: 'Save failed',
        addUser: {
          title: 'Add user',
          email: 'Email',
          name: 'Name',
          role: 'Role',
          tempPassword: 'Temporary password',
          confirmPassword: 'Confirm password',
          create: 'Create user',
          creating: 'Creating...',
          created: 'User created',
          createFailed: 'User creation failed',
          validation: {
            validEmailRequired: 'Valid email is required',
            passwordsDoNotMatch: 'Passwords do not match'
          }
        },
        list: {
          title: 'Existing users'
        }
      },
    },
  },
  hu: {
    translation: {
      app: {
        title: 'Lead Gyűjtő',
        back: 'Vissza',
        goHome: 'Ugrás a főoldalra',
        home: 'Főoldal',
        settings: 'Beállítások',
        notFound: 'Kérdőív nem található',
        notFoundDesc: 'A kért kérdőív ("{{id}}") nem létezik.',
      },
      auth: {
        signInTitle: 'Jelentkezzen be fiókjába',
        error: 'Hiba',
        loading: 'Betöltés',
        emailLabel: 'E-mail címe',
        passwordLabel: 'Jelszó',
        signIn: 'Bejelentkezés',
        logout: 'Kijelentkezés',
      },
      home: {
        choose: 'Válasszon kérdőívet',
        new: 'Új kérdőív',
        submissions: 'Beküldések',
        importJson: 'JSON importálása',
        start: 'Indítás',
        edit: 'Szerkesztés',
        export: 'Exportálás',
        delete: 'Törlés',
        predefinedWarn: 'Előre definiált kérdőíveket nem lehet törölni.',
        confirmDelete:
          'Törli: "{{name}}"? Egyedi kérdőívek esetén ez nem visszavonható.',
        imported: 'Importált kérdőív: {{name}}',
        invalidJson: 'Érvénytelen JSON',
        missingFields: 'Hiányzó kötelező mezők: név, kérdések',
        failedImport: 'A fájl importálása sikertelen',
      },
      editor: {
        headingCreate: 'Kérdőív létrehozása',
        headingEdit: 'Kérdőív szerkesztése',
        name: 'Név',
        description: 'Leírás',
        question: 'Kérdés {{index}}',
        duplicate: 'Duplikálás',
        remove: 'Eltávolítás',
        label: 'Címke',
        type: 'Típus',
        types: {
          text: 'Szöveg',
          textarea: 'Szövegterület',
          checkbox: 'Jelölőnégyzet',
          radio: 'Választógomb',
          dropdown: 'Legördülő',
          image: 'Kép',
        },
        descriptionOptional: 'Leírás (opcionális)',
        options: 'Opciók',
        addOption: 'Opció hozzáadása',
        removeOption: 'Eltávolítás',
        addQuestion: 'Kérdés hozzáadása',
        save: 'Mentés',
        failedToSave: 'Mentés sikertelen',
      },
      questionnaire: {
        yes: 'Igen',
        select: 'Válasszon...',
        start: 'Indítás',
        stop: 'Leállítás',
        send: 'Küldés',
        sending: 'Küldés...',
        send_without_jira: 'Küldés JIRA nélkül',
        transcribe_gcs: 'Átirat készítése (GCS)',
        transcribing: 'Átirat készítése...',
        accept_terms_text: 'Elfogadom a',
        terms_link: 'Felhasználási feltételeket',
        accept_terms_error: 'A folytatáshoz el kell fogadnia a felhasználási feltételeket.',
        change_image: 'Kép cseréje',
        change: 'Módosítás',
        remove: 'Eltávolítás',
        use_camera: 'Kamera használata',
        upload_from_device: 'Feltöltés eszközről',
        retake_camera: 'Újrafotózás (kamera)'
      },
      submissions: {
        title: 'Beküldések',
        back: 'Vissza',
        refresh: 'Frissítés',
        retry: 'Újra',
        retrying: 'Újrapróbálás... ',
        open: 'Megnyitás',
        close: 'Bezárás',
        empty: 'Még nincs rögzített beküldés.',
        headers: {
          status: 'Állapot',
          summary: 'Összefoglaló',
          questionnaire: 'Kérdőív',
          date: 'Dátum',
          actions: 'Műveletek',
        },
        status: {
          jira: 'JIRA létrehozva',
          local: 'Helyben tárolva',
          firestore: 'Felhőben tárolva',
          auth: 'Hitelesítés szükséges',
          error: 'Hiba',
          unknown: 'Ismeretlen',
        },
        openInJira: 'Megnyitás JIRA-ban',
        details: 'Részletek',
        delete: 'Törlés',
        confirmDelete: 'Törli ezt a beküldési rekordot?',
        desktopView: 'Asztali nézet',
        mobileView: 'Mobil nézet',
      },
      terms: {
        title: 'Felhasználási feltételek',
        intro: 'Ezek a felhasználási feltételek szabályozzák az alkalmazás használatát.',
        placeholder: 'Kérjük, figyelmesen olvassa el a feltételeket. A folytatással elfogadja azokat.'
      },
      success: {
        title: 'JIRA feladat sikeresen létrehozva',
        summary: 'Összegzés',
        submitted: 'Kérelmét elküldtük.',
        issue: 'Feladat'
      },
      camera: {
        close: 'Bezárás',
        capture: 'Felvétel',
        front: 'Előlapi',
        rear: 'Hátlapi',
        error_unable_access: 'Nem lehet hozzáférni a kamerához'
      },
      settings: {
        title: 'Beállítások',
        tabs: {
          general: 'Általános',
          user: 'Felhasználói beállítások',
          list: 'Felhasználók listája',
          add: 'Felhasználó hozzáadása'
        },
        general: {
          language: {
            title: 'Nyelv',
            desc: 'Válassza ki az alkalmazás nyelvét.'
          },
          theme: {
            title: 'Téma',
            desc: 'Váltás világos és sötét téma között.'
          }
        },
        form: {
          jiraProjectKey: 'JIRA Projekt kulcs',
          jiraIssueType: 'JIRA Feladat típusa',
          jiraCloudId: 'JIRA Cloud azonosító',
          cloudIdHelp: 'Ha meg van adva, a backend ezt használhatja egy konkrét Jira oldal megcélzásához.',
          placeholders: {
            projectKey: 'pl. ABC',
            issueType: 'Feladat',
            cloudId: 'Opcionális, általában OAuth során derül ki',
            email: 'user@example.com',
            name: 'Teljes név (opcionális)',
            tempPassword: 'Opcionális',
            confirmPassword: 'Jelszó megismétlése'
          }
        },
        save: 'Mentés',
        saving: 'Mentés...',
        saved: 'Elmentve',
        saveFailed: 'Mentés sikertelen',
        addUser: {
          title: 'Felhasználó hozzáadása',
          email: 'E-mail',
          name: 'Név',
          role: 'Szerepkör',
          tempPassword: 'Ideiglenes jelszó',
          confirmPassword: 'Jelszó megerősítése',
          create: 'Felhasználó létrehozása',
          creating: 'Létrehozás...',
          created: 'Felhasználó létrehozva',
          createFailed: 'Felhasználó létrehozása sikertelen',
          validation: {
            validEmailRequired: 'Érvényes e-mail szükséges',
            passwordsDoNotMatch: 'A jelszavak nem egyeznek',
            passwordRequired: 'Jelszó megadása kötelező'
          }
        },
        list: {
          title: 'Létező felhasználók'
        }
      },
    },
  },
} as const;

export const LANGUAGE_STORAGE_KEY = 'appLanguage';

function getStoredLanguage(): string | null {
  try {
    return typeof window !== 'undefined' && window.localStorage
      ? window.localStorage.getItem(LANGUAGE_STORAGE_KEY)
      : null;
  } catch {
    return null;
  }
}

const initialLng = getStoredLanguage() || 'hu';

void i18n.use(initReactI18next).init({
  resources,
  lng: initialLng,
  fallbackLng: 'hu',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
