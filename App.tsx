
// ... existing imports ...

// ... existing component logic ...

            // Utilities (Rendered as pages or modals wrapper)
            case 'maintenance': return <Maintenance onClose={() => navigate('partner')} />;
            case 'route_calc': return <RouteCalculator onClose={() => navigate('partner')} />;
            case 'fuel_calc': return <FuelCalculator onClose={() => navigate('partner')} />;
            
            case 'about': return <AboutApp />;
            case 'cloud': return <CloudSync />;
            case 'associate_driver': return <AssociateDriver userRole={userRole} />;
            
            // Normal User Dashboard (Uses DailyDashboard)
// ... existing rest of file ...
