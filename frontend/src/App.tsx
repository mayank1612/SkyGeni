import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  AppBar,
  Toolbar,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  CssBaseline,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import { KPISummaryBar } from './components/KPISummaryBar';
import { RevenueDrivers } from './components/RevenueDrivers';
import { RiskFactors } from './components/RiskFactors';
import { Recommendations } from './components/Recommendations';
import { RevenueTrendChart } from './components/RevenueTrendChart';
import { QuarterSelector } from './components/common';
import api from './services/api';
import type {
  SummaryResponse,
  DriversResponse,
  RiskFactorsResponse,
  RecommendationsResponse,
} from './types';

// Create MUI theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e', // Dark blue like SkyGeni
      light: '#534bae',
      dark: '#000051',
    },
    secondary: {
      main: '#0d47a1',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)',
        },
      },
    },
  },
});

function App() {
  // State
  const [quarters, setQuarters] = useState<string[]>([]);
  const [selectedQuarter, setSelectedQuarter] = useState<string>('Q1 2026');
  const [comparisonQuarter, setComparisonQuarter] = useState<string>('');

  const [summaryData, setSummaryData] = useState<SummaryResponse | null>(null);
  const [driversData, setDriversData] = useState<DriversResponse | null>(null);
  const [riskFactorsData, setRiskFactorsData] = useState<RiskFactorsResponse | null>(null);
  const [recommendationsData, setRecommendationsData] = useState<RecommendationsResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch available quarters
  useEffect(() => {
    api
      .getQuarters()
      .then((data) => {
        setQuarters(data.quarters);
        if (data.quarters.length > 0 && !data.quarters.includes(selectedQuarter)) {
          setSelectedQuarter(data.quarters[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch quarters:', err);
        setError('Failed to load available quarters');
      });
  }, []);

  // Fetch all data when quarter changes
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summary, drivers, riskFactors, recommendations] = await Promise.all([
        api.getSummary(selectedQuarter, comparisonQuarter || undefined),
        api.getDrivers(selectedQuarter, comparisonQuarter || undefined),
        api.getRiskFactors(selectedQuarter),
        api.getRecommendations(selectedQuarter, comparisonQuarter || undefined),
      ]);

      setSummaryData(summary);
      setDriversData(drivers);
      setRiskFactorsData(riskFactors);
      setRecommendationsData(recommendations);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [selectedQuarter, comparisonQuarter]);

  useEffect(() => {
    if (quarters.length > 0) {
      fetchData();
    }
  }, [fetchData, quarters]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Header */}
        <AppBar position="static" elevation={0}>
          <Toolbar>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>
              SkyGeni
            </Typography>
            <Typography variant="subtitle1" sx={{ ml: 2, opacity: 0.9 }}>
              Revenue Intelligence Console
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <QuarterSelector
              quarters={quarters}
              selectedQuarter={selectedQuarter}
              onQuarterChange={setSelectedQuarter}
              comparisonQuarter={comparisonQuarter}
              onComparisonChange={setComparisonQuarter}
            />
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="xl" sx={{ py: 3 }}>
          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Initial Loading */}
          {loading && !summaryData && (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          )}

          {/* Dashboard Content */}
          {(summaryData || !loading) && (
            <>
              {/* KPI Summary Bar */}
              <Box sx={{ mb: 3 }}>
                <KPISummaryBar data={summaryData} loading={loading} />
              </Box>

              {/* Main Grid */}
              <Grid container spacing={3}>
                {/* Left Column - Revenue Drivers */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <RevenueDrivers data={driversData} loading={loading} />
                </Grid>

                {/* Middle Column - Risk Factors */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <RiskFactors data={riskFactorsData} loading={loading} />
                </Grid>

                {/* Right Column - Recommendations */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Recommendations data={recommendationsData} loading={loading} />
                </Grid>

                {/* Full Width - Revenue Trend Chart */}
                <Grid size={{ xs: 12 }}>
                  <RevenueTrendChart data={summaryData?.trend || null} loading={loading} />
                </Grid>
              </Grid>
            </>
          )}

          {/* Footer */}
          <Box sx={{ mt: 4, pt: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="caption" color="text.secondary">
              Revenue Intelligence Console | Data as of {new Date().toLocaleDateString()}
            </Typography>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
