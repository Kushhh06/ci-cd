process.env.DATA_DIR = '/tmp/ai-notes-test-' + process.pid;

const request = require('supertest');
const app = require('../src/server');
const { _resetForTest } = require('../src/server');

beforeEach(() => _resetForTest());

describe('Health Endpoint', () => {
  it('GET /api/health returns 200 with status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Notes API', () => {
  it('GET /api/notes returns an empty array initially', async () => {
    const res = await request(app).get('/api/notes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(0);
  });

  it('POST /api/notes creates a new note', async () => {
    const res = await request(app)
      .post('/api/notes')
      .send({ title: 'Test Note', content: 'This is test content' });
    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.title).toBe('Test Note');
    expect(res.body.content).toBe('This is test content');
    expect(res.body.createdAt).toBeDefined();
  });

  it('POST /api/notes persists note and GET returns it', async () => {
    await request(app).post('/api/notes').send({ title: 'Persisted', content: 'Should survive' });
    const res = await request(app).get('/api/notes');
    expect(res.body.length).toBe(1);
    expect(res.body[0].title).toBe('Persisted');
  });

  it('POST /api/notes returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/notes').send({ content: 'No title here' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('POST /api/notes returns 400 when content is missing', async () => {
    const res = await request(app).post('/api/notes').send({ title: 'No content here' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  it('DELETE /api/notes/:id removes a note', async () => {
    const create = await request(app)
      .post('/api/notes')
      .send({ title: 'To Delete', content: 'Will be deleted' });
    const id = create.body.id;

    const del = await request(app).delete(`/api/notes/${id}`);
    expect(del.status).toBe(204);

    const list = await request(app).get('/api/notes');
    expect(list.body.length).toBe(0);
  });

  it('DELETE /api/notes/:id returns 404 for non-existent note', async () => {
    const res = await request(app).delete('/api/notes/99999');
    expect(res.status).toBe(404);
  });
});

describe('Chat API', () => {
  it('POST /api/chat returns 400 when message is missing', async () => {
    const res = await request(app).post('/api/chat').send({});
    expect(res.status).toBe(400);
  });

  it('POST /api/chat returns a response (no API key = friendly fallback)', async () => {
    const res = await request(app).post('/api/chat').send({ message: 'Hello AI' });
    expect(res.status).toBe(200);
    expect(res.body.response).toBeDefined();
  });
});

describe('Summarise API', () => {
  it('POST /api/summarise returns 400 when notes is empty', async () => {
    const res = await request(app).post('/api/summarise').send({ notes: [] });
    expect(res.status).toBe(400);
  });

  it('POST /api/summarise returns summary (no API key = friendly fallback)', async () => {
    const res = await request(app)
      .post('/api/summarise')
      .send({ notes: [{ title: 'Test', content: 'Content here' }] });
    expect(res.status).toBe(200);
    expect(res.body.summary).toBeDefined();
  });
});
