import { BaseService } from './base.service';
import { Envelope, EnvelopeCreateRequest, EnvelopeUpdateRequest, EnvelopeReorderRequest, EnvelopeType, ApiError, ErrorCode } from '@nvlp/types';

export class EnvelopeService extends BaseService {
  async listEnvelopes(budgetId: string): Promise<Envelope[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('envelopes')
      .select('*')
      .eq('budget_id', budgetId)
      .order('name', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as Envelope[];
  }

  async getEnvelope(id: string): Promise<Envelope> {
    const { data, error } = await this.client
      .from('envelopes')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      if (error?.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Envelope not found');
      }
      this.handleError(error);
    }

    await this.verifyBudgetAccess(data.budget_id);
    return data as Envelope;
  }

  async createEnvelope(budgetId: string, request: EnvelopeCreateRequest): Promise<Envelope> {
    await this.verifyBudgetAccess(budgetId);

    // Get next display_order if not provided
    let displayOrder = request.display_order;
    if (displayOrder === undefined && request.category_id) {
      const { data: nextOrder } = await this.client
        .rpc('get_next_envelope_display_order', { category_id_param: request.category_id });
      displayOrder = nextOrder || 0;
    }

    const { data, error } = await this.client
      .from('envelopes')
      .insert({
        budget_id: budgetId,
        name: request.name,
        description: request.description,
        target_amount: request.target_amount,
        envelope_type: request.envelope_type || EnvelopeType.REGULAR,
        category_id: request.category_id,
        display_order: displayOrder || 0,
        notify_on_low_balance: request.notify_on_low_balance ?? false,
        low_balance_threshold: request.low_balance_threshold,
      })
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as Envelope;
  }

  async updateEnvelope(id: string, updates: EnvelopeUpdateRequest): Promise<Envelope> {
    const envelope = await this.getEnvelope(id);

    const { data, error } = await this.client
      .from('envelopes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      this.handleError(error);
    }

    return data as Envelope;
  }

  async deleteEnvelope(id: string): Promise<void> {
    const envelope = await this.getEnvelope(id);

    if (envelope.current_balance !== 0) {
      throw new ApiError(
        ErrorCode.VALIDATION_ERROR,
        'Cannot delete envelope with non-zero balance'
      );
    }

    const { error } = await this.client
      .from('envelopes')
      .delete()
      .eq('id', id);

    if (error) {
      this.handleError(error);
    }
  }

  async getEnvelopesByCategory(budgetId: string, categoryId: string): Promise<Envelope[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('envelopes')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('category_id', categoryId)
      .order('name', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as Envelope[];
  }

  async getNegativeBalanceEnvelopes(budgetId: string): Promise<Envelope[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('envelopes')
      .select('*')
      .eq('budget_id', budgetId)
      .lt('current_balance', 0)
      .order('current_balance', { ascending: true });

    if (error) {
      this.handleError(error);
    }

    return data as Envelope[];
  }

  async getLowBalanceEnvelopes(budgetId: string): Promise<Envelope[]> {
    await this.verifyBudgetAccess(budgetId);

    const { data, error } = await this.client
      .from('envelopes')
      .select('*')
      .eq('budget_id', budgetId)
      .eq('notify_on_low_balance', true)
      .filter('low_balance_threshold', 'not.is', null);

    if (error) {
      this.handleError(error);
    }

    const envelopes = data as Envelope[];
    return envelopes.filter(e => e.current_balance <= (e.low_balance_threshold || 0));
  }

  private async verifyBudgetAccess(budgetId: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { error } = await this.client
      .from('budgets')
      .select('id')
      .eq('id', budgetId)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new ApiError(ErrorCode.NOT_FOUND, 'Budget not found or access denied');
      }
      this.handleError(error);
    }
  }

  async reorderEnvelopes(budgetId: string, reorders: EnvelopeReorderRequest[]): Promise<void> {
    await this.verifyBudgetAccess(budgetId);

    // Update all envelopes' display_order in parallel to reduce latency
    const updatePromises = reorders.map(reorder => 
      this.client
        .from('envelopes')
        .update({ 
          display_order: reorder.display_order,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reorder.id)
        .eq('budget_id', budgetId) // Extra security check
    );

    const updateResults = await Promise.all(updatePromises);
    
    // Check for errors
    updateResults.forEach(result => {
      if (result.error) {
        this.handleError(result.error);
      }
    });

    // Clean up ordering within affected categories
    const affectedCategories = new Set<string>();
    
    // Batch fetch category_ids for all reordered envelopes to avoid N+1 queries
    const envelopeIds = reorders.map(r => r.id);
    const { data: envelopes, error: fetchError } = await this.client
      .from('envelopes')
      .select('id, category_id')
      .in('id', envelopeIds);
    
    if (fetchError) {
      this.handleError(fetchError);
    }
    
    // Determine affected categories using the batched data
    envelopes?.forEach(envelope => {
      if (envelope.category_id) {
        affectedCategories.add(envelope.category_id);
      }
    });

    // Reorder each affected category to eliminate gaps
    for (const categoryId of affectedCategories) {
      await this.client.rpc('reorder_envelopes_in_category', { 
        category_id_param: categoryId 
      });
    }
  }
}