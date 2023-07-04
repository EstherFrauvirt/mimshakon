using backend.Core.Data;
using Microsoft.AspNetCore.Http;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Configuration;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Net;
using System.Security.Principal;
using backend.Core.Models;
using backend.Core.Config;
using System.Net.Http;
using MaxMind.GeoIP2.Exceptions;
using Microsoft.Extensions.Configuration;
using ConfigurationManager = backend.Core.Config.ConfigurationManager;
using MaxMind.GeoIP2.Exceptions;
using System.Web.Http.Filters;

namespace backend.Core.Data
{
    public class SqlManager
    {
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ConfigurationManager _cm;
        private readonly IConfiguration _conf;


        public SqlManager( IHttpContextAccessor httpContextAccessor, ConfigurationManager cm, IConfiguration conf)
        {
            _httpContextAccessor = httpContextAccessor;
            _cm = cm;
            _conf = conf;
        }



      
        public JToken GetSqlData(string db, string procedure, List<TableSchema> tableSchema, SqlParameter[] parameters, bool? sendUser)
        {
            HttpException e = null;
            var arrayIndex = -1;

            string connectionString = _conf.GetConnectionString(db).ToString();
            DataSet ds = new DataSet();
            WindowsIdentity.RunImpersonated(((WindowsIdentity)_httpContextAccessor.HttpContext.User.Identity).AccessToken, () =>
             {
            using (SqlConnection conn = new SqlConnection(connectionString))
            {
                using (SqlCommand cmd = new SqlCommand(procedure, conn) { CommandType = CommandType.StoredProcedure })
                {
                    try
                    {
                        cmd.CommandTimeout = 0;
                        cmd.Parameters.AddRange(parameters);
                        var dataAdapter = new SqlDataAdapter(cmd);
                        dataAdapter.Fill(ds);
                    }
                    catch (Exception ex)
                    {
                         e = new HttpException(ex.Message, HttpStatusCode.BadRequest, new Uri(null));
                    }
                }
            }

            });
         
          / if (e != null)
                throw e;
            JObject res = new JObject();
            int index = tableSchema.FindIndex(x => x.level == 0);
            if (index != -1)
            {
                if (tableSchema[index].isArray)
                {
                    arrayIndex = index;
                    tableSchema.ForEach(x => x.level++);
                }
                else
                    res = GetObjFromRow(ds.Tables[index], 0);
            }

            for (int t = 0; t < ds.Tables.Count; t++)
            {
                var schema = tableSchema[t];
                if (index != t || arrayIndex != -1)
                    if (schema.level == 1)
                    {
                        if (schema.isArray)
                        {
                            var arr = new JArray();

                            for (int i = 0; i < ds.Tables[t].Rows.Count; i++)
                                arr.Add(GetObjFromRow(ds.Tables[t], i));
                             res.Add(schema.name, arr);
                           
                        }
                        else
                            res.Add(schema.name, GetObjFromRow(ds.Tables[t], 0));
                    }
                    else if (schema.level == 2)
                    {
                        SetInnerObj(res, ds.Tables[t], schema);
                    }
                    else if (schema.level == 3)
                    {
                        string parentName = tableSchema.Find(x => x.name == schema.containerName).containerName;
                        var parentArray = (JArray)res[parentName];
                        foreach (var parent in parentArray)
                            SetInnerObj((JObject)parent, ds.Tables[t], schema);
                    }
            }
            if (arrayIndex != -1)
                return (JArray)res[tableSchema[arrayIndex].name];
            return res;
        }

        public JObject GetSqlData(string db, string procedure, SqlParameter[] parameters, bool? sendUser)
        {
            HttpException e = null;

            string connectionString = _conf.GetConnectionString(db).ToString();
            DataSet ds = new DataSet();
            WindowsIdentity.RunImpersonated(((WindowsIdentity)_httpContextAccessor.HttpContext.User.Identity).AccessToken, () =>
          {
           
                using (SqlConnection conn = new SqlConnection(connectionString))
                {
                    using (SqlCommand cmd = new SqlCommand(procedure, conn) { CommandType = CommandType.StoredProcedure })
                    {
                        try
                        {
                            cmd.CommandTimeout = 0;
                            cmd.Parameters.AddRange(parameters);
                            var dataAdapter = new SqlDataAdapter(cmd);
                            dataAdapter.Fill(ds);
                        }
                        catch (Exception ex)
                        {
                                   e = new HttpException(ex.Message, HttpStatusCode.BadRequest, new Uri(null));
                        }
                    }
                }

           });
            if (e != null)
                throw e;
            var res = new JObject();
            var columns = new JArray();
            var data = new JArray();

            for (int t = 0; t < ds.Tables.Count; t++)
            {
                var arr = new JArray();
                for (int i = 0; i < ds.Tables[t].Columns.Count; i++)
               
                    arr.Add(ds.Tables[t].Columns[i].ColumnName);
                    columns.Add(arr);
               

                arr = new JArray();
                for (int i = 0; i < ds.Tables[t].Rows.Count; i++)
                    arr.Add(GetObjFromRow(ds.Tables[t], i));

                data.Add(arr);
            }

            res.Add("columns", columns);
            res.Add("data", data);

            return res;
        }

        public void SetInnerObj(JToken res, DataTable table, TableSchema schema)
        {
            if (res[schema.containerName] is JArray)
            {
                var array = (JArray)res[schema.containerName];
                if (array != null)
                    for (int i = 0; i < table.Rows.Count; i++)
                    {
                        var itemFrom = GetObjFromRow(table, i);
                        foreach (var item in array)
                        {
                            if (item["RECORD_NO_TO"].ToString() == itemFrom["RECORD_NO_FROM"].ToString())
                            {
                                if (schema.isArray)
                                {
                                    item[schema.name] ??= new JArray();
                                    ((JArray)item[schema.name]).Add(itemFrom);
                                }
                                else
                                    item[schema.name] = itemFrom;
                                break;
                            }
                        }
                    }
            }
            else
            {
                var item = (JObject)res[schema.containerName];
                if (item != null)
                    for (int i = 0; i < table.Rows.Count; i++)
                    {
                        var itemFrom = GetObjFromRow(table, i);
                        if (item["RECORD_NO_TO"].ToString() == itemFrom["RECORD_NO_FROM"].ToString())
                        {
                            if (schema.isArray)
                            {
                                item[schema.name] ??= new JArray();
                                ((JArray)item[schema.name]).Add(itemFrom);
                            }
                            else
                                item[schema.name] = itemFrom;
                        }
                    }
            }
        }

        private JObject GetObjFromRow(DataTable table, int rowIndex)
        {
            if (table.Rows.Count == 0)
                return new JObject();
            JObject obj = new JObject();
            for (int j = 0; j < table.Columns.Count; j++)
            {
                var key = table.Columns[j].ColumnName;
                var value = table.Rows[rowIndex][j];
                    if (value != DBNull.Value)
                    obj.Add(key, new JValue(value));

            }
            return obj;
        }

        public SqlParameter[] ToSqlParameters(IQueryCollection data)
        {
            List<SqlParameter> parameters = new List<SqlParameter>();
            foreach (var item in data)
            {
                SqlParameter p;
                if (item.Value == "null")
                    p = new SqlParameter(item.Key, DBNull.Value);
                else
                {
                    var isNumeric = int.TryParse(item.Value, out int _);
                    if (isNumeric)
                    {
                        p = new SqlParameter(item.Key, SqlDbType.Int);
                        p.Value = int.Parse(item.Value.ToString());
                    }
                    else
                    {
                        p = new SqlParameter(item.Key, item.Value.ToString());
                    }
                }
                parameters.Add(p);
            }
            return parameters.ToArray();
        }

        public SqlParameter[] ToSqlParameters(JToken data)
        {
            Dictionary<string, object> dataList = (Dictionary<string, object>)ToCollection(data);

            List<SqlParameter> parameters = new List<SqlParameter>();
            foreach (var item in dataList)
            {
                if (item.Value == null)
                    parameters.Add(new SqlParameter(item.Key, DBNull.Value));
                else
                    parameters.Add(new SqlParameter(item.Key, item.Value));
            }
            return parameters.ToArray();
        }

        public object ToCollection(object o)
        {
            if (o is JObject jo) return jo.ToObject<IDictionary<string, object>>().ToDictionary(k => k.Key, v => ToCollection(v.Value));
            if (o is JArray ja) return JsonConvert.DeserializeObject<DataTable>(ja.ToString());
            return o;
        }
    }
}
