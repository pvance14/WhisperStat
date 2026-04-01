import { RouterProvider } from "react-router-dom";

import { AuthProvider } from "@/app/AuthProvider";
import { router } from "@/app/router";

export const App = () => (
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>
);
