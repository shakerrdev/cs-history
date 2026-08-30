import { neon } from '@neondatabase/serverless'
import axios from 'axios'
import { sub } from 'date-fns'

const LEETIFY_BASE_URL = 'https://api-public.cs-prod.leetify.com'

const main = async () => {
  if (!process.env.POSTGRES_CONNECTION_STRING || !process.env.LEETIFY_API_KEY) throw new Error('missing env')

  const sql = neon(process.env.POSTGRES_CONNECTION_STRING)

  const lastEntry = await sql`SELECT * FROM matches ORDER BY date DESC LIMIT 1`
  let lastDate = (lastEntry[0]?.date as Date) || sub(new Date(), { days: 7 })
  lastDate = sub(lastDate, { days: 2000 })

  const accounts = [
    { id: '76561198092541763', name: 'Tobeyyy' },
    { id: '76561198119268786', name: 'Shaker' },
    { id: '76561198351596677', name: 'Tako' },
    { id: '76561198300616918', name: 'Shaker Smurf 1' },
    { id: '76561198260426246', name: 'Shaker Smurf 2' },
    { id: '76561198174929263', name: 'Tobeyyy Smurf 1' },
    { id: '76561198201014401', name: 'Tobeyyy Smurf 2' },
    { id: '76561198089207957', name: 'Snake' },
    { id: '76561197981567696', name: 'nimm2' }
    // { id: '76561198306022786', name: 'Vollstrecker' },
    // { id: '76561198292130745', name: 'Terrine' }
  ]

  console.log('Fetching History: Tobeyyy')
  await processMatches(await fetchProfileHistory(lastDate, accounts[0]), sql, 'Tobeyyy')

  return

  await Promise.all(
    accounts.map((account) =>
      fetchProfileHistory(lastDate, account)
        .then((matches) => processMatches(matches, sql, account.name))
        .catch((error) => console.error(error))
    )
  )
}
main()

async function fetchProfileHistory(lastDate: Date, account: { id: string; name: string }) {
  console.log('Fetching history', account.name)

  const matches = await axios
    .get(`${LEETIFY_BASE_URL}/v3/profile/matches`, {
      params: { steam64_id: account.id },
      headers: {
        Authorization: 'Bearer ' + process.env.LEETIFY_API_KEY
      }
    })
    .then((result) => result.data as LeetifyMatch[])
    .catch((error) => {
      console.error('error fetching history', account, error)
      return [] as LeetifyMatch[]
    })

  return matches.filter((m) => new Date(m.finished_at).getTime() > lastDate.getTime())
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMatches(matches: LeetifyMatch[], sql: any, name: string) {
  console.log(name, 'Matches: ' + matches.length)

  for (const matchSummary of matches) {
    const id = matchSummary.id
    console.log(name, id, matchSummary.finished_at)

    const entry = await sql`SELECT * FROM matches WHERE id = ${id}`
    if (entry.length > 0) continue

    console.log(name, 'Fetching match info')

    try {
      const match = await axios
        .get(`${LEETIFY_BASE_URL}/v2/matches/${id}`, {
          headers: {
            Authorization: 'Bearer ' + process.env.LEETIFY_API_KEY
          }
        })
        .then((result) => result.data as LeetifyMatchDetails)

      await processMatch(match, sql)
    } catch (error) {
      console.error(name, 'Failed to process match', id, error)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processMatch(match: LeetifyMatchDetails, sql: any) {
  const players = match.stats

  if (!players || players.length === 0) {
    console.warn('No player stats for match', match.id)
    return
  }

  const teamIds = new Set<number>()
  for (const player of players) teamIds.add(player.initial_team_number)

  const [team1Id, team2Id] = [...teamIds]

  const team1Players = players.filter((player) => player.initial_team_number === team1Id)
  const team2Players = players.filter((player) => player.initial_team_number === team2Id)

  const team1Score = match.team_scores.find((t) => t.team_number === team1Id)?.score ?? null
  const team2Score = match.team_scores.find((t) => t.team_number === team2Id)?.score ?? null

  await sql`
    INSERT INTO matches (id, players_team1, players_team2, rounds_team1, rounds_team2, type, date, map)
    VALUES (
        ${match.id},
        ${team1Players.map((player) => player.steam64_id)},
        ${team2Players.map((player) => player.steam64_id)},
        ${isNaN(team1Score as number) || team1Score === null ? null : team1Score},
        ${isNaN(team2Score as number) || team2Score === null ? null : team2Score},
        'Leetify',
        ${match.finished_at},
        ${match.map_name}
    )
    ON CONFLICT (id) DO NOTHING;
  `
}

type LeetifyMatch = {
  id: string
  finished_at: string
  data_source: string
  outcome: string
  rank: number
  rank_type: string | null
  map_name: string
  leetify_rating: number
  score: [number, number]
  preaim: number
  reaction_time_ms: number
  accuracy_enemy_spotted: number
  accuracy_head: number
  spray_accuracy: number
}

type LeetifyMatchDetails = {
  id: string
  finished_at: string
  data_source: string
  data_source_match_id: string
  map_name: string
  has_banned_player: boolean
  team_scores: TeamScore[]
  stats: PlayerStats[]
}

type TeamScore = {
  team_number: number
  score: number
}

type PlayerStats = {
  steam64_id: string
  name: string
  initial_team_number: number
  total_kills: number
  total_deaths: number
  total_assists: number
  rounds_won: number
  rounds_lost: number
  rounds_count: number
  leetify_rating: number | null
  ct_leetify_rating: number | null
  t_leetify_rating: number | null
}
