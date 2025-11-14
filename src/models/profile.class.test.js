// src/models/profile.class.test.js
const Profile = require('./profile.class');
const db = require('./db');

// --- Mock da Base de Dados ---
jest.mock('./db', () => ({
  query: jest.fn(),
}));

// --- Início dos Testes ---
describe('Profile Class (Unit Tests)', () => {

  beforeEach(() => {
    db.query.mockClear();
  });

  it('deve criar um perfil com valores padrão', () => {
    const profile = new Profile({ user: 'Alexandre' });

    expect(profile.user).toBe('Alexandre');
    expect(profile.bio).toBe('Nenhuma bio definida.');
    expect(profile.mood).toBe('✨ novo por aqui!');
    expect(profile.avatar_url).toBe(null);
  });

  it('deve verificar se o utilizador segue outro (isFollowing)', async () => {
    db.query.mockResolvedValue({ rows: [{ '1': 1 }] });
    
    const profile = new Profile({ user: 'Alexandre' });
    const isFollowing = await profile.isFollowing('Tsuki');

    expect(isFollowing).toBe(true);
    expect(db.query).toHaveBeenCalledWith(
      'SELECT 1 FROM follows WHERE follower_user = $1 AND following_user = $2',
      ['Alexandre', 'Tsuki']
    );
  });

  it('deve verificar se o utilizador NÃO segue outro (isFollowing)', async () => {
    db.query.mockResolvedValue({ rows: [] });
    
    const profile = new Profile({ user: 'Alexandre' });
    const isFollowing = await profile.isFollowing('Goku');

    expect(isFollowing).toBe(false);
  });

  // 👇 MUDANÇA (CORREÇÃO DO TESTE) 👇
  it('deve salvar (atualizar) uma bio', async () => {
    // 1. Prepara a "mentira"
    // O save() agora retorna a linha inteira
    const mockRow = { user: 'Alexandre', bio: 'Bio atualizada', mood: '✨ novo por aqui!', avatar_url: null };
    db.query.mockResolvedValue({ rows: [mockRow] });

    // 2. Executa
    const profile = new Profile({ user: 'Alexandre' });
    profile.bio = 'Bio atualizada';
    await profile.save();

    // 3. Verifica
    expect(db.query).toHaveBeenCalledWith(
      // Verifica se o SQL está a usar o INSERT ... ON CONFLICT
      expect.stringContaining('INSERT INTO profiles'),
      // Verifica se os valores corretos foram enviados
      ['Alexandre', 'Bio atualizada', profile.mood, profile.avatar_url]
    );
    // Verifica se o objeto foi atualizado
    expect(profile.bio).toBe('Bio atualizada');
  });
  //  FIM DA MUDANÇA 

});