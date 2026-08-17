import NotificationsPage from '../shared/NotificationsPage'
import EmployeeSidebar from '../../components/employee/EmployeeSidebar'

export default function EmployeeNotifications() {
  return <NotificationsPage role="employee" Sidebar={EmployeeSidebar} layout="sidebar" />
}
