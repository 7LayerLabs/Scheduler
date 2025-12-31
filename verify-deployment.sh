#!/bin/bash

# Tempo Scheduler - Pre-Deployment Verification Script
# Run this before deploying to verify everything is working

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║    TEMPO SCHEDULER - PRE-DEPLOYMENT VERIFICATION SCRIPT       ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

# Function to print test result
test_result() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ PASS${NC}: $1"
        ((PASS++))
    else
        echo -e "${RED}❌ FAIL${NC}: $1"
        ((FAIL++))
    fi
}

echo "TEST SUITE 1: BUILD & COMPILATION"
echo "=================================="
echo ""

# Test 1: Check if npm is installed
npm --version > /dev/null 2>&1
test_result "npm is installed"

# Test 2: Check if dependencies are installed
[ -d "node_modules" ]
test_result "node_modules directory exists"

# Test 3: Build production bundle
npm run build > /tmp/build.log 2>&1
test_result "npm run build completes successfully"

# Test 4: Check build output
[ -d ".next" ]
test_result ".next directory generated"

echo ""
echo "TEST SUITE 2: ROUTE COMPILATION"
echo "==============================="
echo ""

# Test 5: Check main routes are compiled
grep -q "/analytics" /tmp/build.log
test_result "/analytics route compiled"

grep -q "/templates" /tmp/build.log
test_result "/templates route compiled"

grep -q "/notifications" /tmp/build.log
test_result "/notifications route compiled"

echo ""
echo "TEST SUITE 3: COMPONENT FILES"
echo "============================"
echo ""

# Test 6-8: Check all component files exist
[ -f "components/notifications/NotificationBell.tsx" ]
test_result "NotificationBell.tsx exists"

[ -f "components/templates/TemplateLibrary.tsx" ]
test_result "TemplateLibrary.tsx exists"

[ -f "components/analytics/AnalyticsDashboard.tsx" ]
test_result "AnalyticsDashboard.tsx exists"

echo ""
echo "TEST SUITE 4: DATABASE INTEGRATION"
echo "=================================="
echo ""

# Test 9-12: Check InstantDB exports
grep -q "export function useNotifications" lib/instantdb.ts
test_result "useNotifications hook exported"

grep -q "export function useScheduleTemplates" lib/instantdb.ts
test_result "useScheduleTemplates hook exported"

grep -q "export function useAnalyticsHistory" lib/instantdb.ts
test_result "useAnalyticsHistory hook exported"

grep -q "export async function saveCurrentScheduleAsTemplate" lib/templates/saveTemplate.ts
test_result "Template save function exported"

echo ""
echo "TEST SUITE 5: GIT STATUS"
echo "======================="
echo ""

# Test 13: Check git status is clean
[ -z "$(git status --porcelain)" ]
test_result "Working tree is clean (all changes committed)"

# Test 14: Check we have commits
git log -1 > /dev/null 2>&1
test_result "Git history is available"

echo ""
echo "TEST SUITE 6: DOCUMENTATION"
echo "==========================="
echo ""

# Test 15-18: Check documentation files exist
[ -f "INTEGRATION_CHECKLIST.md" ]
test_result "INTEGRATION_CHECKLIST.md exists"

[ -f "DEPLOYMENT_GUIDE.md" ]
test_result "DEPLOYMENT_GUIDE.md exists"

[ -f "PRE_DEPLOYMENT_CHECKLIST.md" ]
test_result "PRE_DEPLOYMENT_CHECKLIST.md exists"

[ -f "PROJECT_COMPLETE.txt" ]
test_result "PROJECT_COMPLETE.txt exists"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "VERIFICATION RESULTS"
echo "════════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}PASSED: $PASS${NC}"
echo -e "${RED}FAILED: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}║          ✅ ALL TESTS PASSED - READY FOR DEPLOYMENT          ║${NC}"
    echo -e "${GREEN}║                                                              ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Review PRE_DEPLOYMENT_CHECKLIST.md"
    echo "  2. Review DEPLOYMENT_GUIDE.md"
    echo "  3. Run: npm start (to test production build locally)"
    echo "  4. Deploy to Vercel, AWS, or your preferred hosting"
    echo ""
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}║        ❌ SOME TESTS FAILED - FIX BEFORE DEPLOYING           ║${NC}"
    echo -e "${RED}║                                                              ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Failed tests must be resolved before deployment."
    echo "Check the output above for details."
    echo ""
    exit 1
fi
