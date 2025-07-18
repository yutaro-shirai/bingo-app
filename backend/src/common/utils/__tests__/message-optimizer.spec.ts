import { MessageOptimizer, PropertyMaps } from '../message-optimizer';

describe('MessageOptimizer', () => {
  describe('compress', () => {
    it('should remove null and undefined values', () => {
      const message = {
        id: '123',
        name: 'Test',
        description: null,
        value: undefined,
      };

      const result = MessageOptimizer.compress(message);

      expect(result).toEqual({
        id: '123',
        name: 'Test',
      });
    });

    it('should use property map for compression', () => {
      const message = {
        id: '123',
        name: 'Test',
        age: 30,
      };

      const propertyMap = {
        id: 'i',
        name: 'n',
        age: 'a',
      };

      const result = MessageOptimizer.compress(message, propertyMap);

      expect(result).toEqual({
        i: '123',
        n: 'Test',
        a: 30,
      });
    });

    it('should handle nested objects', () => {
      const message = {
        id: '123',
        user: {
          name: 'Test',
          email: null,
          address: {
            city: 'New York',
            zip: '10001',
          },
        },
      };

      const propertyMap = {
        id: 'i',
        user: 'u',
        name: 'n',
        address: 'a',
        city: 'c',
        zip: 'z',
      };

      const result = MessageOptimizer.compress(message, propertyMap);

      expect(result).toEqual({
        i: '123',
        u: {
          n: 'Test',
          a: {
            c: 'New York',
            z: '10001',
          },
        },
      });
    });

    it('should handle arrays', () => {
      const message = {
        id: '123',
        items: [
          { name: 'Item 1', price: 10 },
          { name: 'Item 2', price: 20, description: null },
        ],
      };

      const propertyMap = {
        id: 'i',
        items: 'it',
        name: 'n',
        price: 'p',
      };

      const result = MessageOptimizer.compress(message, propertyMap);

      expect(result).toEqual({
        i: '123',
        it: [
          { n: 'Item 1', p: 10 },
          { n: 'Item 2', p: 20 },
        ],
      });
    });

    it('should handle dates', () => {
      const date = new Date('2023-01-01T00:00:00Z');
      const message = {
        id: '123',
        createdAt: date,
      };

      const result = MessageOptimizer.compress(message);

      expect(result).toEqual({
        id: '123',
        createdAt: date.toISOString(),
      });
    });

    it('should return original message on error', () => {
      const message = {
        id: '123',
        circular: {},
      };
      
      // Create circular reference
      message.circular.self = message;

      // Mock console.error to avoid test output pollution
      const originalError = console.error;
      console.error = jest.fn();

      const result = MessageOptimizer.compress(message);

      // Restore console.error
      console.error = originalError;

      // Should return original message on error
      expect(result).toBe(message);
    });
  });

  describe('decompress', () => {
    it('should restore original property names', () => {
      const message = {
        i: '123',
        n: 'Test',
        a: 30,
      };

      const propertyMap = {
        id: 'i',
        name: 'n',
        age: 'a',
      };

      const result = MessageOptimizer.decompress(message, propertyMap);

      expect(result).toEqual({
        id: '123',
        name: 'Test',
        age: 30,
      });
    });

    it('should handle nested objects', () => {
      const message = {
        i: '123',
        u: {
          n: 'Test',
          a: {
            c: 'New York',
            z: '10001',
          },
        },
      };

      const propertyMap = {
        id: 'i',
        user: 'u',
        name: 'n',
        address: 'a',
        city: 'c',
        zip: 'z',
      };

      const result = MessageOptimizer.decompress(message, propertyMap);

      expect(result).toEqual({
        id: '123',
        user: {
          name: 'Test',
          address: {
            city: 'New York',
            zip: '10001',
          },
        },
      });
    });

    it('should handle arrays', () => {
      const message = {
        i: '123',
        it: [
          { n: 'Item 1', p: 10 },
          { n: 'Item 2', p: 20 },
        ],
      };

      const propertyMap = {
        id: 'i',
        items: 'it',
        name: 'n',
        price: 'p',
      };

      const result = MessageOptimizer.decompress(message, propertyMap);

      expect(result).toEqual({
        id: '123',
        items: [
          { name: 'Item 1', price: 10 },
          { name: 'Item 2', price: 20 },
        ],
      });
    });

    it('should return original message on error', () => {
      const message = {
        i: '123',
        circular: {},
      };
      
      // Create circular reference
      message.circular.self = message;

      // Mock console.error to avoid test output pollution
      const originalError = console.error;
      console.error = jest.fn();

      const result = MessageOptimizer.decompress(message);

      // Restore console.error
      console.error = originalError;

      // Should return original message on error
      expect(result).toBe(message);
    });
  });

  describe('optimizeForTransmission', () => {
    it('should combine compression and other optimizations', () => {
      const message = {
        id: '123',
        name: 'Test',
        description: null,
      };

      const propertyMap = {
        id: 'i',
        name: 'n',
      };

      const result = MessageOptimizer.optimizeForTransmission(message, propertyMap);

      expect(result).toEqual({
        i: '123',
        n: 'Test',
      });
    });
  });

  describe('PropertyMaps', () => {
    it('should have predefined property maps', () => {
      expect(PropertyMaps.Game).toBeDefined();
      expect(PropertyMaps.Player).toBeDefined();
      expect(PropertyMaps.Card).toBeDefined();
      expect(PropertyMaps.Event).toBeDefined();
    });

    it('should compress game entity correctly', () => {
      const game = {
        id: 'game-123',
        code: 'ABC123',
        status: 'active',
        createdAt: new Date(),
        drawnNumbers: [1, 2, 3],
        playerCount: 10,
        activePlayerCount: 8,
        bingoCount: 2,
      };

      const result = MessageOptimizer.compress(game, PropertyMaps.Game);

      expect(result).toEqual({
        i: 'game-123',
        c: 'ABC123',
        s: 'active',
        ca: expect.any(String),
        dn: [1, 2, 3],
        pc: 10,
        ap: 8,
        bc: 2,
      });
    });

    it('should compress player entity correctly', () => {
      const player = {
        id: 'player-456',
        gameId: 'game-123',
        name: 'Test Player',
        card: {
          grid: [[1, 2, 3, 4, 5]],
        },
        punchedNumbers: [1, 2, 3],
        hasBingo: false,
        isOnline: true,
      };

      const result = MessageOptimizer.compress(player, PropertyMaps.Player);

      expect(result).toEqual({
        i: 'player-456',
        gi: 'game-123',
        n: 'Test Player',
        c: {
          grid: [[1, 2, 3, 4, 5]],
        },
        pn: [1, 2, 3],
        hb: false,
        io: true,
      });
    });
  });
});