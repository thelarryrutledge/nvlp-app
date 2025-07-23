/**
 * Envelope Service
 * 
 * Service layer for envelope operations with error handling
 */

import { enhancedApiClient } from './clientWrapper';
import { transformError, logError } from './errors';
import type { Envelope, CreateEnvelopeInput, UpdateEnvelopeInput, QueryParams } from '@nvlp/types';

class EnvelopeService {
  /**
   * Get all envelopes for a budget
   */
  async getEnvelopes(budgetId?: string, params?: QueryParams): Promise<Envelope[]> {
    try {
      const envelopes = await enhancedApiClient.getEnvelopes(budgetId, params);
      return envelopes;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'EnvelopeService.getEnvelopes');
      throw apiError;
    }
  }

  /**
   * Get a specific envelope by ID
   */
  async getEnvelope(id: string): Promise<Envelope> {
    try {
      const envelope = await enhancedApiClient.getEnvelope(id);
      return envelope;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'EnvelopeService.getEnvelope');
      throw apiError;
    }
  }

  /**
   * Create a new envelope
   */
  async createEnvelope(input: CreateEnvelopeInput): Promise<Envelope> {
    try {
      const envelope = await enhancedApiClient.createEnvelope(input);
      return envelope;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'EnvelopeService.createEnvelope');
      throw apiError;
    }
  }

  /**
   * Update an existing envelope
   */
  async updateEnvelope(id: string, updates: UpdateEnvelopeInput): Promise<Envelope> {
    try {
      const envelope = await enhancedApiClient.updateEnvelope(id, updates);
      return envelope;
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'EnvelopeService.updateEnvelope');
      throw apiError;
    }
  }

  /**
   * Delete an envelope
   */
  async deleteEnvelope(id: string): Promise<void> {
    try {
      await enhancedApiClient.deleteEnvelope(id);
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'EnvelopeService.deleteEnvelope');
      throw apiError;
    }
  }

  /**
   * Update envelope order for drag-and-drop reordering
   */
  async updateEnvelopeOrder(envelopes: { id: string; sort_order: number }[]): Promise<void> {
    try {
      // Update each envelope's sort order
      await Promise.all(
        envelopes.map(({ id, sort_order }) =>
          enhancedApiClient.updateEnvelope(id, { sort_order })
        )
      );
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'EnvelopeService.updateEnvelopeOrder');
      throw apiError;
    }
  }
}

export const envelopeService = new EnvelopeService();