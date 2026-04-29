import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/customers/:path*",
    "/leads/:path*",
    "/bookings/:path*",
    "/visa/:path*",
    "/packages/:path*",
    "/quotations/:path*",
    "/invoices/:path*",
    "/payments/:path*",
    "/agents/:path*",
    "/wallet/:path*",
    "/suppliers/:path*",
    "/documents/:path*",
    "/reports/:path*",
    "/staff/:path*",
    "/settings/:path*",
    "/customer-portal/:path*",
    "/agent-portal/:path*",
  ],
};
