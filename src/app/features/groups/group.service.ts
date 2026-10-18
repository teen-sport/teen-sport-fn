import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Schedule } from '../../Core/Models/common';
import { EntityStatus } from '../../Core/Models/role';
import {
  CreateGroupRequest,
  Group,
  GroupQuery,
  ScheduleRequest,
  UpdateGroupRequest,
} from './group.models';

/** Administración de grupos y de sus horarios semanales (H6 a H14). */
@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;
  private readonly url = `${this.base}/groups`;

  list(query: GroupQuery = {}): Observable<Group[]> {
    let params = new HttpParams();
    if (query.disciplineId != null) {
      params = params.set('disciplineId', query.disciplineId);
    }
    if (query.coachId != null) {
      params = params.set('coachId', query.coachId);
    }
    if (query.status) {
      params = params.set('status', query.status);
    }
    return this.http.get<Group[]>(this.url, { params });
  }

  get(id: number): Observable<Group> {
    return this.http.get<Group>(`${this.url}/${id}`);
  }

  create(request: CreateGroupRequest): Observable<Group> {
    return this.http.post<Group>(this.url, request);
  }

  update(id: number, request: UpdateGroupRequest): Observable<Group> {
    return this.http.put<Group>(`${this.url}/${id}`, request);
  }

  setStatus(id: number, status: EntityStatus): Observable<Group> {
    return this.http.patch<Group>(`${this.url}/${id}/status`, { status });
  }

  assignCoach(id: number, coachId: number): Observable<Group> {
    return this.http.put<Group>(`${this.url}/${id}/coach`, { coachId });
  }

  addSchedule(groupId: number, request: ScheduleRequest): Observable<Schedule> {
    return this.http.post<Schedule>(`${this.url}/${groupId}/schedules`, request);
  }

  updateSchedule(scheduleId: number, request: ScheduleRequest): Observable<Schedule> {
    return this.http.put<Schedule>(`${this.base}/schedules/${scheduleId}`, request);
  }

  deleteSchedule(scheduleId: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/schedules/${scheduleId}`);
  }
}
