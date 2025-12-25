const fs = require('fs');

let content = fs.readFileSync('./frontend/src/components/layout/Sidebar.tsx', 'utf8');

// Update the Sidebar function to check for admin and filter items
const oldFunction = `export function Sidebar() {
  const pathname = usePathname();
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [visitedPages, setVisitedPages] = useState<Set<string>>(new Set());

  // Load visited pages on mount
  useEffect(() => {
    setVisitedPages(getVisitedPages());
  }, []);`;

const newFunction = `export function Sidebar() {
  const pathname = usePathname();
  const [marketStatus, setMarketStatus] = useState(getMarketStatus());
  const [visitedPages, setVisitedPages] = useState<Set<string>>(new Set());
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin on mount
  useEffect(() => {
    const checkAdmin = () => {
      if (typeof document !== 'undefined') {
        const isAdminCookie = document.cookie.includes('time_is_admin=true');
        setIsAdmin(isAdminCookie);
      }
    };
    checkAdmin();
    // Re-check when document changes
    const interval = setInterval(checkAdmin, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load visited pages on mount
  useEffect(() => {
    setVisitedPages(getVisitedPages());
  }, []);`;

// Update the navigation map to filter admin items
const oldNavMap = `{navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const showNewBadge = shouldShowNew(item);
          return (
            <Link`;

const newNavMap = `{navigation
          .filter((item) => !(item as any).adminOnly || isAdmin) // Hide admin items from non-admins
          .map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const showNewBadge = shouldShowNew(item);
          return (
            <Link`;

// Update the price display to use item.price
const oldPriceDisplay = `{(item as any).isPremium && (
                <span className="ml-auto flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                  <Gem className="w-3 h-3" />
                  $59
                </span>
              )}`;

const newPriceDisplay = `{(item as any).isPremium && (
                <span className="ml-auto flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 font-bold">
                  <Gem className="w-3 h-3" />
                  {(item as any).price || '$59'}
                </span>
              )}`;

let modified = false;

if (content.includes(oldFunction)) {
  content = content.replace(oldFunction, newFunction);
  modified = true;
  console.log('Updated Sidebar function');
}

if (content.includes(oldNavMap)) {
  content = content.replace(oldNavMap, newNavMap);
  modified = true;
  console.log('Updated navigation map');
}

if (content.includes(oldPriceDisplay)) {
  content = content.replace(oldPriceDisplay, newPriceDisplay);
  modified = true;
  console.log('Updated price display');
}

if (modified) {
  fs.writeFileSync('./frontend/src/components/layout/Sidebar.tsx', content);
  console.log('Sidebar rendering updated');
} else {
  console.log('No matches found');
}
