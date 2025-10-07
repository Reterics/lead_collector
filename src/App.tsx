import { Routes, Route, Navigate, useParams, Link } from 'react-router-dom';
import Home from './pages/Home.tsx';
import Settings from './pages/Settings.tsx';
import Questionnaire from './pages/Questionnaire.tsx';
import QuestionnaireEditor from './pages/QuestionnaireEditor.tsx';
import SubmissionsList from './pages/SubmissionsList.tsx';
import SubmissionsDesktop from './components/submissions/SubmissionsDesktop.tsx';
import JiraSuccess from './pages/JiraSuccess.tsx';
import { useQuestionnaireContext } from './context/QuestionnaireContext';
import SignInComponent from './pages/SignIn.tsx';
import AuthProvider, { AuthContext } from './context/AuthContext.tsx';
import { useContext } from 'react';
import PageLoading from './components/PageLoading.tsx';
import { FirebaseProvider } from './services/firebase.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import Footer from './components/Footer.tsx';
import { useTranslation } from 'react-i18next';
import { JiraAuthProvider } from './context/JiraAuthContext.tsx';
import Terms from './pages/Terms.tsx';
import { SubmissionsProvider } from './context/SubmissionsContext.tsx';

function QuestionnaireRoute() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { getById } = useQuestionnaireContext();

  const schema = id ? getById(id) : undefined;
  if (!id) return <Navigate to="/" replace />;
  if (!schema) {
    return (
      <>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {t('app.notFound')}
          </h2>
          <div className="flex items-center gap-2">
            <Link to="/" className="text-blue-600 hover:underline">
              &larr; {t('app.back')}
            </Link>
          </div>
        </div>
        <p className="text-gray-700 dark:text-gray-300">
          {t('app.notFoundDesc', { id })}
        </p>
      </>
    );
  }
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <Link to="/" className="text-blue-600 hover:underline">
          &larr; {t('app.back')}
        </Link>
      </div>
      <Questionnaire schema={schema} />
    </>
  );
}

function AuthenticatedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useContext(AuthContext);

  if (!user) return <SignInComponent />;

  if (loading) return <PageLoading />;

  return children;
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <JiraAuthProvider>
        <section className="h-screen bg-gray-50 dark:bg-gray-900 pb-12">
          <div className="h-full w-full mx-auto px-4 pt-6 overflow-y-auto">
            <Routes>
              <Route
                path="/"
                element={
                  <AuthenticatedRoute>
                    <FirebaseProvider>
                      <Home />
                    </FirebaseProvider>
                  </AuthenticatedRoute>
                }
              />
              <Route path="/login" element={<SignInComponent />} />
              <Route
                path="/questionnaires/new"
                element={
                  <AuthenticatedRoute>
                    <FirebaseProvider>
                      <QuestionnaireEditor />
                    </FirebaseProvider>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/questionnaires/:id/edit"
                element={
                  <AuthenticatedRoute>
                    <FirebaseProvider>
                      <QuestionnaireEditor />
                    </FirebaseProvider>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/questionnaires/:id"
                element={
                  <AuthenticatedRoute>
                    <FirebaseProvider>
                      <QuestionnaireRoute />
                    </FirebaseProvider>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/questionnaires/:id/success"
                element={
                  <AuthenticatedRoute>
                    <FirebaseProvider>
                      <JiraSuccess />
                    </FirebaseProvider>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/submissions"
                element={
                  <AuthenticatedRoute>
                    <FirebaseProvider>
                      <SubmissionsProvider>
                        <SubmissionsList />
                      </SubmissionsProvider>
                    </FirebaseProvider>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/submissions/desktop"
                element={
                  <AuthenticatedRoute>
                    <FirebaseProvider>
                      <SubmissionsProvider>
                        <SubmissionsDesktop />
                      </SubmissionsProvider>
                    </FirebaseProvider>
                  </AuthenticatedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <AuthenticatedRoute>
                    <FirebaseProvider>
                      <Settings />
                    </FirebaseProvider>
                  </AuthenticatedRoute>
                }
              />
              <Route path="/terms" element={<Terms />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <Footer />
        </section>
        </JiraAuthProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
