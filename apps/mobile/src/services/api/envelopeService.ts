/**
 * Envelope Service
 * 
 * Service layer for envelope operations with error handling
 */

import { apiClient } from './client';
import { transformError, logError } from './errors';
import type { Envelope, CreateEnvelopeInput, UpdateEnvelopeInput, QueryParams } from '@nvlp/types';

class EnvelopeService {
  /**
   * Get all envelopes for a budget
   */
  async getEnvelopes(budgetId?: string, params?: QueryParams): Promise<Envelope[]> {
    try {
      const envelopes = await apiClient.getEnvelopes(budgetId, params);
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
      const envelope = await apiClient.getEnvelope(id);
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
      const envelope = await apiClient.createEnvelope(input);
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
      const envelope = await apiClient.updateEnvelope(id, updates);
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
      await apiClient.deleteEnvelope(id);
    } catch (error) {
      const apiError = transformError(error);
      logError(apiError, 'EnvelopeService.deleteEnvelope');
      throw apiError;
    }
  }
}

export const envelopeService = new EnvelopeService();