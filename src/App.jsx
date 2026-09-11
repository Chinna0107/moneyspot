import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import WhatWeDo from './pages/WhatWeDo'
import About from './pages/About'
import Contact from './pages/Contact'
import ProductDetails from './pages/ProductDetails'
import LoginCustomer from './pages/LoginCustomer'
import RegisterCustomer from './pages/RegisterCustomer'
import LoginEmployee from './pages/LoginEmployee'
import LoginSuperAdmin from './pages/LoginSuperAdmin'
import NotFound from './pages/NotFound'
import FAQ from './pages/FAQ'
import TermsConditions from './pages/TermsConditions'
import Privacy from './pages/Privacy'
import FloatingContact from './components/FloatingContact'
import { SuperAdminRoute, AdminRoute, EmployeeRoute, CustomerRoute } from './components/ProtectedRoute'

// SuperAdmin Pages
import SuperAdminDashboard from './pages/superadmin/Dashboard'
import AdminsData from './pages/superadmin/AdminsData'
import EmployeesData from './pages/superadmin/EmployeesData'
import AttendanceData from './pages/superadmin/AttendanceData'
import ServicesData from './pages/superadmin/ServicesData'
import Insights from './pages/superadmin/Insights'
import Branches from './pages/superadmin/Branches'
import PendingPayments from './pages/shared/PendingPayments'
import CustomerReminders from './pages/shared/CustomerReminders'
import Tracking from './pages/superadmin/Tracking'
import Finance from './pages/superadmin/Finance'
import Configuration from './pages/superadmin/Configuration'
import Reports from './pages/superadmin/Reports'
import Security from './pages/superadmin/Security'
import SuperAdminCustomers from './pages/superadmin/Customers'
import SuperadminGrowth from './pages/superadmin/Growth'
import SuperadminAssignTargets from './pages/superadmin/AssignTargets'
import FraudList from './pages/superadmin/FraudList'
import Notifications from './pages/superadmin/Notifications'
import RedemptionList from './pages/superadmin/RedemptionList'
import SuperAdminTransactions from './pages/superadmin/Transactions'
import SuperadminDueDates from './pages/superadmin/BillDueDates'
import SACustomerInfo from './pages/superadmin/CustomerInfo'
import SAGallery from './pages/superadmin/Gallery'
import SACareers from './pages/superadmin/Careers'
import CreateAssignment from './pages/superadmin/CreateAssignment'
import AssignmentResults from './pages/superadmin/AssignmentResults'
import Verifications from './pages/superadmin/Verifications'
import Gallery from './pages/Gallery'
import Careers from './pages/Careers'

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard'
import CreateEmployee from './pages/admin/CreateEmployee'
import Requests from './pages/admin/Requests'
import EmployeeDetails from './pages/admin/EmployeeDetails'
import EmployeePerformance from './pages/admin/EmployeePerformance'
import EmployeeAttendance from './pages/admin/EmployeeAttendance'
import AdminInsights from './pages/admin/Insights'
import AdminTransactions from './pages/admin/Transactions'
import AdminDueDates from './pages/admin/BillDueDates'
import AdminFinance from './pages/admin/Finance'
import AdminCustomers from './pages/admin/Customers'
import AdminReports from './pages/admin/Reports'
import AdminSecurity from './pages/admin/Security'
import AdminConfig from './pages/admin/Config'
import FinanceDashboard from './pages/admin/FinanceDashboard'
import AdminGrowth from './pages/admin/Growth'
import AdminAssignTargets from './pages/admin/AssignTargets'
import Wallets from './pages/admin/Wallets'
import Ledger from './pages/admin/Ledger'
import CashFlow from './pages/admin/CashFlow'
import Expenses from './pages/admin/Expenses'
import Settlements from './pages/admin/Settlements'
import DailyClosing from './pages/admin/DailyClosing'
import Profit from './pages/admin/Profit'
import CustomerReverify from './pages/admin/CustomerReverify'
import AdminVerifications from './pages/admin/Verifications'


// Employee Pages
import EmployeeDashboard from './pages/employee/Dashboard'
import CustomerInfo from './pages/employee/CustomerInfo'
import AddCustomer from './pages/employee/AddCustomer'
import Services from './pages/employee/Services'
import EmployeeDueDates from './pages/employee/BillDueDates'
import EmployeeTransactions from './pages/employee/EmployeeTransactions'
import EmployeeExpenses from './pages/employee/EmployeeExpenses'
import EmployeeRequests from './pages/employee/Requests'
import BranchAttendance from './pages/employee/BranchAttendance'
import EmployeeReports from './pages/employee/EmployeeReports'
import Profile from './pages/employee/Profile'
import Leads from './pages/employee/Leads'
import AdminLeads from './pages/admin/Leads'
import SuperAdminLeads from './pages/superadmin/Leads'
import EmployeeSidebar from './components/employee/EmployeeSidebar'
import AdminSidebar from './components/admin/AdminSidebar'
import EmployeeNotifications from './pages/employee/Notifications'
import AdminNotifications from './pages/admin/Notifications'
import TakeAssignment from './pages/employee/TakeAssignment'
import EmployeeAssignmentResult from './pages/employee/EmployeeAssignmentResult'
import EmployeeVerifications from './pages/employee/Verifications'

// Customer Pages
import CustomerDashboard from './pages/customer/Dashboard'
import CustomerServices from './pages/customer/Services'
import CustomerTransactions from './pages/customer/Transactions'
import CustomerKYC from './pages/customer/KYC'
import CustomerCibil from './pages/customer/CustomerCibil'
import CustomerCoins from './pages/customer/Coins'
import { CustomerOffers, CustomerNotifications, CustomerSupport, CustomerSecurity } from './pages/customer/Misc'

import './App.css'

const dashboardPrefixes = ['/superadmin', '/admin', '/employee', '/customer']

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }, [pathname])
  return null
}

function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <>
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <main>{children}</main>
      <Footer />
      <FloatingContact hidden={menuOpen} />
    </>
  )
}

function ConditionalLayout({ children }) {
  const { pathname } = useLocation()
  const isDashboard = dashboardPrefixes.some(p => pathname.startsWith(p))
  if (isDashboard) return children
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" />
      <ScrollToTop />
      <Routes>
        {/* Public routes with layout */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/what-we-do" element={<Layout><WhatWeDo /></Layout>} />
        <Route path="/about" element={<Layout><About /></Layout>} />
        <Route path="/contact" element={<Layout><Contact /></Layout>} />
        <Route path="/faq" element={<Layout><FAQ /></Layout>} />
        <Route path="/terms" element={<Layout><TermsConditions /></Layout>} />
        <Route path="/privacy" element={<Layout><Privacy /></Layout>} />
        <Route path="/gallery" element={<Layout><Gallery /></Layout>} />
        <Route path="/careers" element={<Layout><Careers /></Layout>} />
        <Route path="/product/:slug" element={<Layout><ProductDetails /></Layout>} />

        {/* Login routes */}
        <Route path="/login/employee" element={<LoginEmployee />} />
        <Route path="/login/customer" element={<LoginCustomer />} />
        <Route path="/customer/register" element={<RegisterCustomer />} />
        <Route path="/login/superadmin" element={<LoginSuperAdmin />} />

        {/* SuperAdmin routes */}
        <Route path="/superadmin/dashboard"  element={<SuperAdminRoute><SuperAdminDashboard /></SuperAdminRoute>} />
        <Route path="/superadmin/admins"     element={<SuperAdminRoute><AdminsData /></SuperAdminRoute>} />
        <Route path="/superadmin/employees"  element={<SuperAdminRoute><EmployeesData /></SuperAdminRoute>} />
        <Route path="/superadmin/attendance" element={<SuperAdminRoute><AttendanceData /></SuperAdminRoute>} />
        <Route path="/superadmin/leads"       element={<SuperAdminRoute><SuperAdminLeads /></SuperAdminRoute>} />
        <Route path="/superadmin/services"   element={<SuperAdminRoute><ServicesData /></SuperAdminRoute>} />
        <Route path="/superadmin/insights"   element={<SuperAdminRoute><Insights /></SuperAdminRoute>} />
        <Route path="/superadmin/branches"   element={<SuperAdminRoute><Branches /></SuperAdminRoute>} />
        <Route path="/superadmin/tracking"   element={<SuperAdminRoute><Tracking /></SuperAdminRoute>} />
        <Route path="/superadmin/finance"    element={<SuperAdminRoute><Finance /></SuperAdminRoute>} />
        <Route path="/superadmin/verifications" element={<SuperAdminRoute><Verifications /></SuperAdminRoute>} />
        <Route path="/superadmin/config"     element={<SuperAdminRoute><Configuration /></SuperAdminRoute>} />
        <Route path="/superadmin/reports"    element={<SuperAdminRoute><Reports /></SuperAdminRoute>} />
        <Route path="/superadmin/customers"  element={<SuperAdminRoute><SuperAdminCustomers /></SuperAdminRoute>} />
        <Route path="/superadmin/customer-reminders" element={<SuperAdminRoute><CustomerReminders role="superadmin" /></SuperAdminRoute>} />
        <Route path="/superadmin/security"   element={<SuperAdminRoute><Security /></SuperAdminRoute>} />
        <Route path="/superadmin/growth"     element={<SuperAdminRoute><SuperadminGrowth /></SuperAdminRoute>} />
        <Route path="/superadmin/assign-targets" element={<SuperAdminRoute><SuperadminAssignTargets /></SuperAdminRoute>} />
        {/* <Route path="/admin/profile"          element={<AdminRoute><Profile Sidebar={AdminSidebar} isAdmin={true} /></AdminRoute>} /> */}
        <Route path="/superadmin/fraud"         element={<SuperAdminRoute><FraudList /></SuperAdminRoute>} />
        <Route path="/superadmin/notifications"  element={<SuperAdminRoute><Notifications /></SuperAdminRoute>} />
        <Route path="/superadmin/redemptions"    element={<SuperAdminRoute><RedemptionList /></SuperAdminRoute>} />
        <Route path="/superadmin/transactions"    element={<SuperAdminRoute><SuperAdminTransactions /></SuperAdminRoute>} />
        <Route path="/superadmin/due-dates"       element={<SuperAdminRoute><SuperadminDueDates /></SuperAdminRoute>} />
        <Route path="/superadmin/customer-info"    element={<SuperAdminRoute><SACustomerInfo /></SuperAdminRoute>} />
        <Route path="/superadmin/gallery"            element={<SuperAdminRoute><SAGallery /></SuperAdminRoute>} />
        <Route path="/superadmin/careers"            element={<SuperAdminRoute><SACareers /></SuperAdminRoute>} />
        <Route path="/superadmin/pending-payments"   element={<SuperAdminRoute><PendingPayments role="superadmin" /></SuperAdminRoute>} />
        <Route path="/superadmin/create-assignment"  element={<SuperAdminRoute><CreateAssignment /></SuperAdminRoute>} />
        <Route path="/superadmin/assignment-results" element={<SuperAdminRoute><AssignmentResults /></SuperAdminRoute>} />

        {/* Admin routes */}
        <Route path="/admin/dashboard"       element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/insights"        element={<AdminRoute><AdminInsights /></AdminRoute>} />
        <Route path="/admin/transactions"    element={<AdminRoute><AdminTransactions /></AdminRoute>} />
        <Route path="/admin/due-dates"       element={<AdminRoute><AdminDueDates /></AdminRoute>} />
        <Route path="/admin/finance"         element={<AdminRoute><FinanceDashboard /></AdminRoute>} />
        <Route path="/admin/growth"          element={<AdminRoute><AdminGrowth /></AdminRoute>} />
        <Route path="/admin/assign-targets"  element={<AdminRoute><AdminAssignTargets /></AdminRoute>} />
        <Route path="/admin/finance/wallets"     element={<AdminRoute><Wallets /></AdminRoute>} />
        <Route path="/admin/finance/ledger"      element={<AdminRoute><Ledger /></AdminRoute>} />
        <Route path="/admin/finance/cashflow"    element={<AdminRoute><CashFlow /></AdminRoute>} />
        <Route path="/admin/finance/expenses"    element={<AdminRoute><Expenses /></AdminRoute>} />
        <Route path="/admin/finance/settlements" element={<AdminRoute><Settlements /></AdminRoute>} />
        <Route path="/admin/finance/closing"     element={<AdminRoute><DailyClosing /></AdminRoute>} />
        <Route path="/admin/finance/profit"      element={<AdminRoute><Profit /></AdminRoute>} />
        <Route path="/admin/customers"       element={<AdminRoute><AdminCustomers /></AdminRoute>} />
        <Route path="/admin/customer-reminders" element={<AdminRoute><CustomerReminders role="admin" /></AdminRoute>} />
        <Route path="/admin/reports"         element={<AdminRoute><AdminReports /></AdminRoute>} />
        <Route path="/admin/security"        element={<AdminRoute><AdminSecurity /></AdminRoute>} />
        <Route path="/admin/config"          element={<AdminRoute><AdminConfig /></AdminRoute>} />
        <Route path="/admin/create-employee" element={<AdminRoute><CreateEmployee /></AdminRoute>} />
        <Route path="/admin/requests"        element={<AdminRoute><Requests /></AdminRoute>} />
        <Route path="/admin/employees"     element={<AdminRoute><EmployeeDetails /></AdminRoute>} />
        <Route path="/admin/performance"     element={<AdminRoute><EmployeePerformance /></AdminRoute>} />
        <Route path="/admin/attendance"      element={<AdminRoute><EmployeeAttendance /></AdminRoute>} />
        <Route path="/admin/notifications"   element={<AdminRoute><AdminNotifications /></AdminRoute>} />
        <Route path="/admin/leads"            element={<AdminRoute><AdminLeads /></AdminRoute>} />
        <Route path="/admin/pending-payments" element={<AdminRoute><PendingPayments role="admin" /></AdminRoute>} />
        <Route path="/admin/reverify"         element={<AdminRoute><CustomerReverify /></AdminRoute>} />
        <Route path="/admin/verifications"    element={<AdminRoute><AdminVerifications /></AdminRoute>} />

        {/* Employee routes */}
        <Route path="/employee/take-assignment/:id" element={<EmployeeRoute><TakeAssignment /></EmployeeRoute>} />
        <Route path="/employee/dashboard"    element={<EmployeeRoute><EmployeeDashboard /></EmployeeRoute>} />
        <Route path="/employee/customer-info"element={<EmployeeRoute><CustomerInfo /></EmployeeRoute>} />
        <Route path="/employee/add-customer" element={<EmployeeRoute><AddCustomer /></EmployeeRoute>} />
        <Route path="/employee/customer-reminders" element={<EmployeeRoute><CustomerReminders role="employee" /></EmployeeRoute>} />
        <Route path="/employee/services"     element={<EmployeeRoute><Services /></EmployeeRoute>} />
        <Route path="/employee/verifications" element={<EmployeeRoute><EmployeeVerifications /></EmployeeRoute>} />
        <Route path="/employee/due-dates"     element={<EmployeeRoute><EmployeeDueDates /></EmployeeRoute>} />
        <Route path="/employee/leads"         element={<EmployeeRoute><Leads /></EmployeeRoute>} />
        <Route path="/employee/attendance"    element={<EmployeeRoute><EmployeeAttendance /></EmployeeRoute>} />
        <Route path="/employee/reports"       element={<EmployeeRoute><EmployeeReports /></EmployeeRoute>} />
        <Route path="/employee/notifications"  element={<EmployeeRoute><EmployeeNotifications /></EmployeeRoute>} />
        <Route path="/employee/pending-payments" element={<EmployeeRoute><PendingPayments role="employee" /></EmployeeRoute>} />
        <Route path="/employee/profile"       element={<EmployeeRoute><Profile Sidebar={EmployeeSidebar} /></EmployeeRoute>} />
        <Route path="/employee/branch-transactions" element={<EmployeeRoute><EmployeeTransactions /></EmployeeRoute>} />
        <Route path="/employee/branch-expenses" element={<EmployeeRoute><EmployeeExpenses /></EmployeeRoute>} />
        <Route path="/employee/branch-requests" element={<EmployeeRoute><EmployeeRequests /></EmployeeRoute>} />
        <Route path="/employee/branch-attendance" element={<EmployeeRoute><BranchAttendance /></EmployeeRoute>} />
        <Route path="/employee/assignment-result/:id" element={<EmployeeRoute><EmployeeAssignmentResult /></EmployeeRoute>} />
        <Route path="/admin/profile"          element={<AdminRoute><Profile Sidebar={AdminSidebar} isAdmin={true} /></AdminRoute>} />
        

        {/* Customer routes */}
        <Route path="/customer/dashboard"     element={<CustomerRoute><CustomerDashboard /></CustomerRoute>} />
        <Route path="/customer/services"      element={<CustomerRoute><CustomerServices /></CustomerRoute>} />
        <Route path="/customer/transactions"  element={<CustomerRoute><CustomerTransactions /></CustomerRoute>} />
        <Route path="/customer/coins"         element={<CustomerRoute><CustomerCoins /></CustomerRoute>} />
        <Route path="/customer/kyc"           element={<CustomerRoute><CustomerKYC /></CustomerRoute>} />
        <Route path="/customer/cibil"         element={<CustomerRoute><CustomerCibil /></CustomerRoute>} />
        <Route path="/customer/offers"        element={<CustomerRoute><CustomerOffers /></CustomerRoute>} />
        <Route path="/customer/notifications" element={<CustomerRoute><CustomerNotifications /></CustomerRoute>} />
        <Route path="/customer/support"       element={<CustomerRoute><CustomerSupport /></CustomerRoute>} />
        <Route path="/customer/security"      element={<CustomerRoute><CustomerSecurity /></CustomerRoute>} />

        <Route path="*" element={<Layout><NotFound /></Layout>} />
      </Routes>
    </BrowserRouter>
  )
}
