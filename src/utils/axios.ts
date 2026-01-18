// import axios, { AxiosRequestConfig } from "axios";

// interface AxiosParams {
//   [key: string]: any;
// }

// const axiosWrapper = {
//   post: async <T = any>(url: string, body: any, config?: AxiosRequestConfig): Promise<T> => {
//     try {
//       const response = await axios.post<T>(url, body, config);
//       return response.data;
//     } catch (e: any) {
//       const message = e?.response?.data?.error || e.message || "Unknown error";
//       throw new Error(message);
//     }
//   },

//   patch: async <T = any>(url: string, body: any, config?: AxiosRequestConfig): Promise<T> => {
//     try {
//       const response = await axios.patch<T>(url, body, config);
//       return response.data;
//     } catch (e: any) {
//       const message = e?.response?.data?.error || e.message || "Unknown error";
//       throw new Error(message);
//     }
//   },

//   delete: async <T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
//     try {
//       const response = await axios.delete<T>(url, { data, ...config });
//       return response.data;
//     } catch (e: any) {
//       const message = e?.response?.data?.error || e.message || "Unknown error";
//       throw new Error(message);
//     }
//   },

//   get: async <T = any>(url: string, params?: AxiosParams, config?: AxiosRequestConfig): Promise<T> => {
//     try {
//       const response = await axios.get<T>(url, { params, ...config });
//       return response.data;
//     } catch (e: any) {
//       console.error("Axios GET error:", e);
//       const message = e?.response?.data?.error || e.message || "Unknown error";
//       throw new Error(message);
//     }
//   },
// };

// export default axiosWrapper;
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

type ApiResponse<T> = AxiosResponse<T>;

export const axiosWrapper = {
  get<T>(
    url: string,
    params?: Record<string, any>,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return axios.get<T>(url, {
      ...config,
      params, 
    });
  },

  post<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return axios.post<T>(url, data, config);
  },

  patch<T>(
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return axios.patch<T>(url, data, config);
  },

  delete<T>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    return axios.delete<T>(url, config);
  },
};
