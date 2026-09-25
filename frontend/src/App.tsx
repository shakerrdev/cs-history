import { Brightness4, Brightness7, Search } from '@mui/icons-material'
import EditIcon from '@mui/icons-material/Edit'
import PersonIcon from '@mui/icons-material/Person'
import {
  Box,
  Chip,
  CssBaseline,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
  ThemeProvider,
  Tooltip,
  Typography,
  useMediaQuery,
} from '@mui/material'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PlayerTable } from './components/PlayerTable'
import { SteamIdDialog } from './components/SteamIdDialog'
import { useMySteamIds } from './hooks/useMySteamIds'
import { usePlayerFetch } from './hooks/usePlayerFetch'
import { createAppTheme } from './theme'
import { Player } from './types'

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const [darkMode, setDarkMode] = useState(prefersDarkMode)
  const [input, setInput] = useState('')
  const [players, setPlayers] = useState<Player[]>([])
  const [dialogOpen, setDialogOpen] = useState(() => !localStorage.getItem('mySteamIds'))

  const { steamIds: mySteamIds, save: saveSteamIds } = useMySteamIds()
  const { fetchPlayer, loading } = usePlayerFetch(mySteamIds, setPlayers)

  const [searchParams, setSearchParams] = useSearchParams()
  const incomingQueryHandled = useRef(false)

  // Deep link used by the Tampermonkey userscript: /#/?q=<steam id or profile url>.
  // When no Steam IDs are saved yet the dialog is already open and fetchPlayer
  // would no-op, so the query stays in the URL and this runs again on save.
  useEffect(() => {
    if (incomingQueryHandled.current) return

    const query = searchParams.get('q')
    if (!query || mySteamIds.length === 0) return

    incomingQueryHandled.current = true
    fetchPlayer(query)
    setSearchParams({}, { replace: true })
  }, [searchParams, setSearchParams, mySteamIds, fetchPlayer])

  const theme = useMemo(() => createAppTheme(darkMode), [darkMode])

  const handleSearch = (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return
    fetchPlayer(trimmed)
    setInput('')
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            py: 1.5,
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'background.paper',
            position: 'sticky',
            top: 0,
            zIndex: 10,
          }}
        >
          <Typography
            variant="h6"
            sx={{ fontWeight: 800, color: 'primary.main', letterSpacing: '-0.5px', userSelect: 'none' }}
          >
            CS History
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {mySteamIds.length > 0 && (
              <Tooltip
                title={
                  <Box>
                    {mySteamIds.map((id) => (
                      <div key={id}>{id}</div>
                    ))}
                  </Box>
                }
              >
                <Chip
                  icon={<PersonIcon sx={{ fontSize: '14px !important' }} />}
                  label={`${mySteamIds.length} ID${mySteamIds.length > 1 ? 's' : ''}`}
                  size="small"
                  onClick={() => setDialogOpen(true)}
                  sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
                />
              </Tooltip>
            )}
            <Tooltip title="Edit Steam IDs">
              <IconButton size="small" aria-label="Edit Steam IDs" onClick={() => setDialogOpen(true)} color="inherit">
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={darkMode ? 'Light mode' : 'Dark mode'}>
              <IconButton
                size="small"
                aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                onClick={() => setDarkMode((v) => !v)}
                color="inherit"
              >
                {darkMode ? <Brightness7 fontSize="small" /> : <Brightness4 fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Main content */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            pt: { xs: 6, sm: 10 },
            pb: 8,
            gap: 6,
            px: 2,
          }}
        >
          {/* Search */}
          <Box sx={{ width: '100%', maxWidth: 600 }}>
            <TextField
              fullWidth
              placeholder="Steam ID, profile URL, or Leetify link..."
              variant="outlined"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch(input)
                  e.stopPropagation()
                }
              }}
              onPaste={(e) => {
                e.preventDefault()
                handleSearch(e.clipboardData.getData('text'))
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '50px',
                  backgroundColor: 'background.paper',
                  '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'primary.main' },
                },
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {loading && (
            <Box sx={{ width: '100%', maxWidth: 600 }}>
              <LinearProgress color="primary" sx={{ borderRadius: 4 }} />
            </Box>
          )}

          {players.length > 0 && (
            <PlayerTable
              players={players}
              mySteamIds={mySteamIds}
              setPlayers={setPlayers}
              fetchPlayer={fetchPlayer}
            />
          )}
        </Box>
      </Box>

      <SteamIdDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        steamIds={mySteamIds}
        onSave={saveSteamIds}
      />
    </ThemeProvider>
  )
}

export default App
