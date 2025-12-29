#!/bin/bash

echo "🧪 Client Payment Records Testing Script"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "admin-dashboard" ]; then
    echo "❌ Error: admin-dashboard directory not found"
    echo "Please run this script from the project root"
    exit 1
fi

echo "📋 Step 1: Check database migration file"
if [ -f "migrations/create_client_payments_table.sql" ]; then
    echo "✅ Migration file exists"
else
    echo "❌ Migration file not found"
    exit 1
fi

echo ""
echo "📋 Step 2: Check if admin-dashboard has dependencies"
cd admin-dashboard
if [ ! -d "node_modules" ]; then
    echo "⚠️  node_modules not found. Installing dependencies..."
    npm install
else
    echo "✅ Dependencies installed"
fi

echo ""
echo "📋 Step 3: Check environment variables"
if [ -f ".env.local" ]; then
    echo "✅ .env.local file exists"
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo "✅ NEXT_PUBLIC_SUPABASE_URL is set"
    else
        echo "⚠️  NEXT_PUBLIC_SUPABASE_URL not found in .env.local"
    fi
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
        echo "✅ SUPABASE_SERVICE_ROLE_KEY is set"
    else
        echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not found in .env.local"
    fi
else
    echo "⚠️  .env.local file not found"
    echo "   Create it with:"
    echo "   NEXT_PUBLIC_SUPABASE_URL=your_url"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your_key"
fi

echo ""
echo "📋 Step 4: Ready to start development server"
echo ""
echo "To start testing:"
echo "  1. Make sure you've run the SQL migration in Supabase"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:3000"
echo "  4. Login and navigate to 'Payment Nodes'"
echo "  5. Click on 'Client Payment Records' tab"
echo ""
echo "📖 See TEST_CLIENT_PAYMENTS.md for detailed testing guide"
