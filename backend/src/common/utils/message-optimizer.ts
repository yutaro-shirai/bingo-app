import { Logger } from '@nestjs/common';

/**
 * Utility class for optimizing WebSocket message size
 */
export class MessageOptimizer {
  private static readonly logger = new Logger(MessageOptimizer.name);

  /**
   * Compress a message by removing null/undefined values and using shorter property names
   * @param message Original message
   * @param propertyMap Map of original property names to shorter ones
   * @returns Compressed message
   */
  static compress<T extends Record<string, any>>(
    message: T,
    propertyMap?: Record<string, string>,
  ): Record<string, any> {
    if (!message) {
      return message;
    }

    try {
      const result: Record<string, any> = {};

      // Process each property
      for (const [key, value] of Object.entries(message)) {
        // Skip null/undefined values
        if (value === null || value === undefined) {
          continue;
        }

        // Use mapped property name if available
        const mappedKey = propertyMap?.[key] || key;

        // Handle nested objects and arrays
        if (typeof value === 'object') {
          if (Array.isArray(value)) {
            // Handle arrays
            result[mappedKey] = value.map((item) =>
              typeof item === 'object' && item !== null
                ? this.compress(item, propertyMap)
                : item,
            );
          } else if (value instanceof Date) {
            // Handle dates - convert to ISO string
            result[mappedKey] = value.toISOString();
          } else {
            // Handle nested objects
            result[mappedKey] = this.compress(value, propertyMap);
          }
        } else {
          // Handle primitive values
          result[mappedKey] = value;
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Error compressing message: ${error.message}`);
      return message; // Return original message on error
    }
  }

  /**
   * Decompress a message by restoring original property names
   * @param message Compressed message
   * @param propertyMap Map of short property names to original ones
   * @returns Decompressed message
   */
  static decompress<T extends Record<string, any>>(
    message: T,
    propertyMap?: Record<string, string>,
  ): Record<string, any> {
    if (!message) {
      return message;
    }

    try {
      const result: Record<string, any> = {};
      const reverseMap: Record<string, string> = {};

      // Create reverse mapping
      if (propertyMap) {
        for (const [original, shortened] of Object.entries(propertyMap)) {
          reverseMap[shortened] = original;
        }
      }

      // Process each property
      for (const [key, value] of Object.entries(message)) {
        // Use original property name if available
        const originalKey = reverseMap[key] || key;

        // Handle nested objects and arrays
        if (typeof value === 'object') {
          if (Array.isArray(value)) {
            // Handle arrays
            result[originalKey] = value.map((item) =>
              typeof item === 'object' && item !== null
                ? this.decompress(item, propertyMap)
                : item,
            );
          } else if (value !== null) {
            // Handle nested objects
            result[originalKey] = this.decompress(value, propertyMap);
          } else {
            result[originalKey] = null;
          }
        } else {
          // Handle primitive values
          result[originalKey] = value;
        }
      }

      return result;
    } catch (error) {
      this.logger.error(`Error decompressing message: ${error.message}`);
      return message; // Return original message on error
    }
  }

  /**
   * Optimize a message for WebSocket transmission
   * This combines compression and any other optimizations
   * @param message Original message
   * @param propertyMap Map of original property names to shorter ones
   * @returns Optimized message
   */
  static optimizeForTransmission<T extends Record<string, any>>(
    message: T,
    propertyMap?: Record<string, string>,
  ): Record<string, any> {
    return this.compress(message, propertyMap);
  }
}

/**
 * Standard property maps for common entities
 */
export const PropertyMaps = {
  Game: {
    id: 'i',
    code: 'c',
    status: 's',
    createdAt: 'ca',
    startedAt: 'sa',
    endedAt: 'ea',
    expiresAt: 'ex',
    drawMode: 'dm',
    drawInterval: 'di',
    drawnNumbers: 'dn',
    lastDrawnAt: 'ld',
    playerCount: 'pc',
    activePlayerCount: 'ap',
    bingoCount: 'bc',
    adminConnections: 'ac',
  },
  Player: {
    id: 'i',
    gameId: 'gi',
    name: 'n',
    card: 'c',
    punchedNumbers: 'pn',
    hasBingo: 'hb',
    bingoAchievedAt: 'ba',
    connectionId: 'ci',
    isOnline: 'io',
    lastSeenAt: 'ls',
  },
  Card: {
    grid: 'g',
    freeSpace: 'fs',
  },
  Event: {
    type: 't',
    payload: 'p',
    timestamp: 'ts',
  },
};
