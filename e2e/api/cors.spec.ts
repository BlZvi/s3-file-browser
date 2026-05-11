import { test, expect } from '../fixtures/auth';
import { BUCKETS } from '../fixtures/constants';

test.describe('API: CORS', () => {
  test('get CORS returns empty rules when not configured', async ({ authedRequest }) => {
    // First ensure no CORS is set
    await authedRequest.delete(`/api/s3/buckets/cors?bucket=${BUCKETS.test}`);

    const res = await authedRequest.get(`/api/s3/buckets/cors?bucket=${BUCKETS.test}`);
    expect(res.status()).toBe(200);
    const data = await res.json();
    expect(data.rules).toBeDefined();
    expect(Array.isArray(data.rules)).toBe(true);
    expect(data.rules).toEqual([]);
  });

  test.skip('set and get CORS rules', async ({ authedRequest }) => {
    // Skip: MinIO does not implement PutBucketCors (returns NotImplemented)
    const rules = [{
      allowedOrigins: ['http://localhost:5173'],
      allowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
      allowedHeaders: ['*'],
      exposeHeaders: ['ETag', 'x-amz-request-id'],
      maxAgeSeconds: 3600
    }];

    // Set CORS
    const setRes = await authedRequest.put('/api/s3/buckets/cors', {
      data: { bucket: BUCKETS.test, rules }
    });
    expect(setRes.status()).toBe(200);

    // Get CORS
    const getRes = await authedRequest.get(`/api/s3/buckets/cors?bucket=${BUCKETS.test}`);
    expect(getRes.status()).toBe(200);
    const data = await getRes.json();
    expect(data.rules.length).toBe(1);
    expect(data.rules[0].allowedOrigins).toContain('http://localhost:5173');
    expect(data.rules[0].allowedMethods).toContain('GET');

    // Cleanup
    await authedRequest.delete(`/api/s3/buckets/cors?bucket=${BUCKETS.test}`);
  });

  test.skip('delete CORS configuration', async ({ authedRequest }) => {
    // Skip: MinIO does not implement DeleteBucketCors (returns NotImplemented)
    // First set some CORS
    await authedRequest.put('/api/s3/buckets/cors', {
      data: {
        bucket: BUCKETS.test,
        rules: [{ allowedOrigins: ['*'], allowedMethods: ['GET'], allowedHeaders: ['*'], exposeHeaders: [] }]
      }
    });

    // Delete CORS
    const delRes = await authedRequest.delete(`/api/s3/buckets/cors?bucket=${BUCKETS.test}`);
    expect(delRes.status()).toBe(200);

    // Verify deleted
    const getRes = await authedRequest.get(`/api/s3/buckets/cors?bucket=${BUCKETS.test}`);
    const data = await getRes.json();
    expect(data.rules).toEqual([]);
  });

  test('returns 400 for missing bucket', async ({ authedRequest }) => {
    const res = await authedRequest.get('/api/s3/buckets/cors');
    expect(res.status()).toBe(400);
  });

  test('PUT returns 400 for missing bucket', async ({ authedRequest }) => {
    const res = await authedRequest.put('/api/s3/buckets/cors', {
      data: { rules: [] }
    });
    expect(res.status()).toBe(400);
  });

  test('PUT returns 400 for missing rules', async ({ authedRequest }) => {
    const res = await authedRequest.put('/api/s3/buckets/cors', {
      data: { bucket: BUCKETS.test }
    });
    expect(res.status()).toBe(400);
  });

  test('DELETE returns 400 for missing bucket', async ({ authedRequest }) => {
    const res = await authedRequest.delete('/api/s3/buckets/cors');
    expect(res.status()).toBe(400);
  });

  test.skip('set multiple CORS rules', async ({ authedRequest }) => {
    // Skip: MinIO does not implement PutBucketCors (returns NotImplemented)
    const rules = [
      {
        allowedOrigins: ['http://localhost:5173'],
        allowedMethods: ['GET', 'HEAD'],
        allowedHeaders: ['*'],
        exposeHeaders: [],
        maxAgeSeconds: 3600
      },
      {
        allowedOrigins: ['https://app.example.com'],
        allowedMethods: ['GET', 'PUT', 'POST', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposeHeaders: ['ETag'],
        maxAgeSeconds: 86400
      }
    ];

    const setRes = await authedRequest.put('/api/s3/buckets/cors', {
      data: { bucket: BUCKETS.test, rules }
    });
    expect(setRes.status()).toBe(200);

    const getRes = await authedRequest.get(`/api/s3/buckets/cors?bucket=${BUCKETS.test}`);
    const data = await getRes.json();
    expect(data.rules.length).toBe(2);

    // Cleanup
    await authedRequest.delete(`/api/s3/buckets/cors?bucket=${BUCKETS.test}`);
  });
});
