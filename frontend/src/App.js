import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Show, SignIn, SignUp } from "@clerk/react";
import { Toaster } from "@/components/ui/sonner";
import ClerkAuthProvider from "@/components/auth/ClerkAuthProvider";
import Landing from "@/pages/Landing";
import AuthLayout from "@/pages/AuthLayout";
import AppGate from "@/pages/AppGate";
import PublicServiceForm from "@/pages/PublicServiceForm";

function Protected() {
  return (
    <>
      <Show when="signed-in"><AppGate /></Show>
      <Show when="signed-out"><Navigate to="/sign-in" replace /></Show>
    </>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/servis-formu/:token" element={<PublicServiceForm />} />
          <Route
            path="*"
            element={
              <ClerkAuthProvider>
                <Routes>
                  <Route path="/" element={<Landing />} />
                  <Route path="/sign-in/*" element={<AuthLayout><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" withSignUp /></AuthLayout>} />
                  <Route path="/sign-up/*" element={<AuthLayout><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" /></AuthLayout>} />
                  <Route path="/app/*" element={<Protected />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </ClerkAuthProvider>
            }
          />
        </Routes>
        <Toaster position="top-center" richColors />
      </BrowserRouter>
    </div>
  );
}

export default App;
