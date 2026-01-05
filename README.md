# Morroky - Morocco Marketplace Platform

A digital marketplace platform for Moroccan merchants and buyers, providing a virtual representation of real-world markets.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 📦 Project Structure

```
src/
├── components/          # UI Components
│   ├── base/            # Base UI components (Toast, ConfirmDialog)
│   ├── modals/          # Modal components
│   └── screens/         # Main application screens
├── managers/            # State and application managers
├── services/            # Backend services (Auth, Merchant, Storage)
├── data/               # Static data files
└── styles/             # Global styles
```

## 🔧 Configuration

Create a `.env` file based on `.env.example`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_KEY=your_supabase_anon_key
```

## 🛡️ Security

- **Environment Variables**: Never commit `.env` files with sensitive credentials
- **Row-Level Security**: Configure Supabase RLS policies for production
- **Error Handling**: Sensitive error details are sanitized before display

## 📝 Key Features

- **Authentication**: Google and email/password auth via Supabase
- **Merchant Management**: Merchant registration and verification system
- **Location Services**: Hierarchical location data for Moroccan markets
- **Product Management**: Product listing and landing page editor
- **Responsive UI**: Mobile-friendly interface with animations

## 🎨 UI Components

- **Toast Notifications**: Global notification system
- **Confirm Dialogs**: User confirmation modals
- **Screen Management**: Router-based navigation system

## 🔄 State Management

The application uses a custom state manager with:
- Pub/Sub pattern for state changes
- Centralized state storage
- Integrated notification system

## 🚀 Deployment

1. Configure Supabase project with proper RLS policies
2. Set up storage buckets with appropriate permissions
3. Build the application: `npm run build`
4. Deploy the `dist/` folder to your hosting provider

## 📋 Development Notes

- **Code Style**: Follow existing patterns for consistency
- **Error Handling**: Always sanitize errors before displaying to users
- **Performance**: Minimize state updates and DOM manipulations
- **Security**: Never log sensitive information to console in production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to your branch
5. Open a pull request

## 📝 License

[MIT License](LICENSE)
